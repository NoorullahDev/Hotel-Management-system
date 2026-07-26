import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getTaxSettings } from '../utils/settings';

// 80mm thermal receipt scaling up slightly for better A4/PDF readability
const RECEIPT_WIDTH = 300;
const MARGIN = 15;
const CONTENT_WIDTH = RECEIPT_WIDTH - (MARGIN * 2);

function drawDashedLine(doc: PDFKit.PDFDocument) {
  doc.moveTo(MARGIN, doc.y)
     .lineTo(RECEIPT_WIDTH - MARGIN, doc.y)
     .dash(2, { space: 2 })
     .lineWidth(0.5)
     .strokeColor('#888888')
     .stroke();
  doc.undash();
  doc.strokeColor('#000000');
  doc.moveDown(0.4);
}

function drawSolidLine(doc: PDFKit.PDFDocument, thickness = 0.5) {
  doc.moveTo(MARGIN, doc.y)
     .lineTo(RECEIPT_WIDTH - MARGIN, doc.y)
     .lineWidth(thickness)
     .strokeColor('#000000')
     .stroke();
  doc.moveDown(0.4);
}

function leftRight(doc: PDFKit.PDFDocument, left: string, right: string, fontSize = 9, bold = false) {
  const font = bold ? 'Helvetica-Bold' : 'Helvetica';
  const y = doc.y;
  doc.font(font).fontSize(fontSize);
  doc.text(left, MARGIN, y, { width: CONTENT_WIDTH * 0.65, continued: false });
  // Go back to same Y for the right side
  doc.font(font).fontSize(fontSize);
  doc.text(right, MARGIN, y, { width: CONTENT_WIDTH, align: 'right' });
}

export const getInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
    const invoiceId = req.params.id as string;
    
    // Accept either the true Invoice ID, or a Booking ID
    let invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            guest: true,
            room: { include: { roomType: true } },
            payments: true,
          }
        },
        items: true
      }
    });

    // If not found by invoice ID, try looking it up by booking ID
    if (!invoice) {
      invoice = await prisma.invoice.findUnique({
        where: { bookingId: invoiceId },
        include: {
          booking: {
            include: {
              guest: true,
              room: { include: { roomType: true } },
              payments: true,
            }
          },
          items: true
        }
      });
    }

    // If still no invoice record, fall back to generating a live receipt from the booking itself
    let booking: any = invoice?.booking ?? null;
    if (!booking) {
      booking = await prisma.booking.findUnique({
        where: { id: invoiceId },
        include: {
          guest: true,
          room: { include: { roomType: true } },
          payments: true,
        }
      });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // ── Fetch Hotel Information from Settings (single query via utility) ────────────
    const [allSettings, legacySettings] = await Promise.all([
      prisma.setting.findMany(),
      prisma.hotelSettings.findFirst(),
    ]);

    const settingMap = Object.fromEntries(allSettings.map(s => [s.key, s.value]));

    const parseSetting = (val: any) => {
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return typeof parsed === 'string' ? parsed : val;
        } catch (e) {
          return val;
        }
      }
      return val;
    };

    const hotelName      = parseSetting(settingMap['hotelName'])      || legacySettings?.name        || 'Your Hotel Name';
    const hotelAddress   = parseSetting(settingMap['hotelAddress'])   || '';
    const contactNumber  = parseSetting(settingMap['contactNumber'])  || '';
    const email          = parseSetting(settingMap['email'])          || '';
    const hotelLogo      = parseSetting(settingMap['hotelLogo'])      || '';
    const currencySymbol = parseSetting(settingMap['currencySymbol']) || legacySettings?.currency || 'Rs.';

    // Tax via shared utility (cached — avoids repeated DB round-trips on busy invoice periods)
    const tax    = await getTaxSettings();
    const taxRate = tax.rate;
    const taxName = tax.name;
    let taxPct  = taxRate * 100;

    // Helper to handle Prisma Decimals OR raw numbers
    const getNumber = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (typeof val.toNumber === 'function') return val.toNumber();
      return Number(val) || 0;
    };

    // ── Build receipt line items ─────────────────────────────────────────
    // If invoice has items stored in DB, use them. Otherwise calculate on the fly.
    type ReceiptLine = { description: string; amount: number };
    let receiptItems: ReceiptLine[] = [];
    let subTotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;
    let grandTotal = 0;

    if (invoice && invoice.items && invoice.items.length > 0) {
      // Use stored invoice items
      const chargeItems: ReceiptLine[] = [];
      let storedTax = 0;
      let storedDiscount = 0;

      (invoice.items as any[]).forEach((item: any) => {
        const amt = getNumber(item.amount);
        const desc = item.description.toLowerCase();
        if (desc.includes('tax') || desc.includes('gst') || desc.includes('vat')) {
          storedTax += amt;
        } else if (desc.includes('discount')) {
          storedDiscount += amt; // negative value
        } else {
          chargeItems.push({ description: item.description, amount: amt });
        }
      });

      subTotal = chargeItems.reduce((s, i) => s + i.amount, 0);
      taxAmount = storedTax;
      discountAmount = storedDiscount;
      grandTotal = subTotal + taxAmount + discountAmount;
      receiptItems = chargeItems;
      
      // Calculate historical tax percentage
      if (subTotal > 0 && taxAmount > 0) {
        taxPct = Math.round((taxAmount / subTotal) * 100);
      } else if (taxAmount === 0) {
        taxPct = 0;
      }
    } else {
      // Calculate on the fly from booking data
      const ciDate = new Date(booking.checkIn);
      const coDate = new Date(booking.checkOut);
      const nights = Math.max(1, Math.ceil((coDate.getTime() - ciDate.getTime()) / (1000 * 60 * 60 * 24)));
      const roomRate = getNumber(booking.room?.price);

      receiptItems.push({ description: `Room Charges (${booking.room?.roomType?.name || 'Standard'})`, amount: nights * roomRate });

      // Include food orders
      const foodOrders = await prisma.foodOrder.findMany({
        where: { bookingId: booking.id },
        include: { items: true }
      });
      for (const order of foodOrders) {
        for (const item of order.items) {
          receiptItems.push({ description: `Restaurant (${item.itemName} x${item.quantity})`, amount: item.quantity * getNumber(item.price) });
        }
      }

      subTotal = receiptItems.reduce((s, i) => s + i.amount, 0);
      taxAmount = subTotal * taxRate;
      grandTotal = subTotal + taxAmount;
    }

    // Calculate stay duration
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    const stayNights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Payment info
    const totalPaid = booking.payments ? booking.payments.reduce((sum: number, p: any) => sum + getNumber(p.amount), 0) : 0;
    const paymentMethods = booking.payments ? [...new Set(booking.payments.map((p: any) => p.method))].join(', ') || 'N/A' : 'N/A';
    const balanceDue = grandTotal - totalPaid;
    const paymentStatus = balanceDue <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING');

    // ── Create Thermal Receipt PDF ──────────────────────────────────────
    const doc = new PDFDocument({ 
      size: [RECEIPT_WIDTH, 800],
      margin: MARGIN,
      bufferPages: true,
    });
    
    // Use invoice ID if available, otherwise use booking ID as the reference
    const invoiceRef = invoice?.id ?? booking.id;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Receipt-${invoiceRef.substring(0, 8)}.pdf"`);
    
    doc.pipe(res);

    // ═══════════════════════════════════════════════════════════════════
    // HEADER — Hotel Logo + Name + Info
    // ═══════════════════════════════════════════════════════════════════
    if (hotelLogo) {
      try {
        let logoPath = '';
        if (hotelLogo.startsWith('/uploads/')) {
          logoPath = path.join(__dirname, '../..', hotelLogo);
        }
        if (logoPath && fs.existsSync(logoPath)) {
          const logoSize = 60;
          const logoX = (RECEIPT_WIDTH - logoSize) / 2;
          doc.image(logoPath, logoX, doc.y, { width: logoSize, height: logoSize });
          doc.y += logoSize + 8;
        }
      } catch (err) {
        console.error('Error loading logo', err);
      }
    }

    doc.font('Helvetica-Bold').fontSize(16).text(hotelName, { align: 'center' });
    doc.moveDown(0.2);
    if (hotelAddress) doc.font('Helvetica').fontSize(9).text(hotelAddress, { align: 'center' });
    if (contactNumber) doc.font('Helvetica').fontSize(9).text(`Tel: ${contactNumber}`, { align: 'center' });
    if (email) doc.font('Helvetica').fontSize(9).text(email, { align: 'center' });
    doc.moveDown(0.6);

    drawDashedLine(doc);

    // INFO
    leftRight(doc, `Invoice #: INV-${invoiceRef.substring(0, 8).toUpperCase()}`, `Date: ${new Date().toLocaleDateString()}`, 9, true);
    leftRight(doc, `Guest: ${booking.guest?.name || 'N/A'}`, `Room: ${booking.room?.number || 'N/A'}`, 9, false);
    leftRight(doc, `Check-in: ${new Date(booking.checkIn).toLocaleDateString()}`, `Check-out: ${new Date(booking.checkOut).toLocaleDateString()}`, 9, false);
    doc.moveDown(0.4);

    drawDashedLine(doc);

    // ITEMS
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Description', MARGIN, doc.y, { width: CONTENT_WIDTH * 0.65, continued: true });
    doc.text('Amount', { align: 'right' });
    doc.moveDown(0.3);
    drawSolidLine(doc, 1);

    receiptItems.forEach(item => {
      leftRight(doc, item.description, `${currencySymbol} ${item.amount.toFixed(2)}`, 9, false);
      doc.moveDown(0.2);
    });
    
    doc.moveDown(0.2);
    drawSolidLine(doc, 0.5);

    // TOTALS
    leftRight(doc, 'Subtotal:', `${currencySymbol} ${subTotal.toFixed(2)}`, 10, true);
    leftRight(doc, `Tax (${taxPct}%):`, `${currencySymbol} ${taxAmount.toFixed(2)}`, 10, false);
    if (discountAmount < 0) {
      leftRight(doc, 'Discount:', `-${currencySymbol} ${Math.abs(discountAmount).toFixed(2)}`, 10, false);
    }
    
    doc.moveDown(0.3);
    drawSolidLine(doc, 1.5);
    leftRight(doc, 'Grand Total:', `${currencySymbol} ${grandTotal.toFixed(2)}`, 14, true);
    
    doc.moveDown(0.3);
    drawSolidLine(doc, 0.5);
    leftRight(doc, 'Paid:', `${currencySymbol} ${totalPaid.toFixed(2)}`, 10, false);
    leftRight(doc, 'Balance Due:', `${currencySymbol} ${balanceDue.toFixed(2)}`, 11, true);
    
    doc.moveDown(0.8);
    drawDashedLine(doc);
    doc.font('Helvetica-Oblique').fontSize(10).text('Thank you for your stay!', { align: 'center' });
    
    // Add just a little bit of gap
    doc.moveDown(1.5);
    
    doc.font('Helvetica').fontSize(8).fillColor('#555555')
       .text('Software is developed by Eagle Nest Creation', { align: 'center' });
    doc.text('Contact: 03405545150', { align: 'center' });
    
    doc.end();
});
