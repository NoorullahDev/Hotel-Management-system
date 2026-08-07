import prisma from '../prisma';
import { checkOutBookingServiceTx } from './booking.service';
import { getTaxSettings, getPublicSettingsData } from '../utils/settings';
import { emitToHotel } from '../socket';
import { notifyRoles } from './notificationService';

import { Prisma } from '@prisma/client';
const { Decimal } = Prisma;

export const formatServiceDescription = (category: string, serviceName: string) => {
  let desc = `${category} — ${serviceName}`;
  desc = desc.replace(/^Housekeeping\s*\((.*?)\)\s*—\s*/i, '$1 — ');
  desc = desc.replace(/^Housekeeping\s*>\s*/i, '');
  desc = desc.replace(/^Housekeeping\s*—\s*/i, '');
  return desc;
};

export const computeInvoiceLineItems = (booking: any, taxRate: number, taxName: string, taxPct: number) => {
  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000));
  
  const invoiceItems: { description: string, qty?: number, rate?: Prisma.Decimal, amount: Prisma.Decimal }[] = [];
  
  // Always coerce price to Decimal to handle SQLite returning strings/numbers
  const roomPrice = new Decimal(booking.room.price.toString());
  const totalRoomCharges = roomPrice.mul(nights);
  invoiceItems.push({ 
    description: `Room Charges (${nights} nights)`, 
    qty: nights,
    rate: roomPrice,
    amount: totalRoomCharges 
  });
  
  let totalFoodCharges = new Decimal(0);
  for (const order of (booking.foodOrders || [])) {
    for (const item of (order.items || [])) {
      // Coerce price to Decimal — SQLite/Prisma may return strings or plain numbers
      const itemPrice = new Decimal(item.price.toString());
      const qty = Number(item.quantity) || 1;
      const itemTotal = itemPrice.mul(qty);
      totalFoodCharges = totalFoodCharges.plus(itemTotal);
      invoiceItems.push({ 
        description: `Restaurant — ${item.itemName}`, 
        qty,
        rate: itemPrice,
        amount: itemTotal 
      });
    }
  }

  let totalServiceCharges = new Decimal(0);
  for (const order of (booking.serviceOrders || [])) {
    for (const item of (order.items || [])) {
      const itemPrice = new Decimal(item.price.toString());
      const qty = Number(item.quantity) || 1;
      const itemTotal = itemPrice.mul(qty);
      totalServiceCharges = totalServiceCharges.plus(itemTotal);
      invoiceItems.push({ 
        description: formatServiceDescription(item.category, item.serviceName), 
        qty,
        rate: itemPrice,
        amount: itemTotal 
      });
    }
  }

  const subTotal = totalRoomCharges.plus(totalFoodCharges).plus(totalServiceCharges);
  const taxAmount = subTotal.mul(taxRate);
  
  invoiceItems.push({ description: `${taxName} (${taxPct}%)`, amount: taxAmount });

  return { items: invoiceItems, subTotal, taxAmount, nights };
};


// Shared invoice generation logic
export const generateInvoice = async (tx: any, booking: any, discount: number = 0) => {
  const tax = await getTaxSettings();
  const { items, subTotal, taxAmount } = computeInvoiceLineItems(booking, tax.rate, tax.name, tax.pct);
  
  // Clone to avoid mutating the original if reused
  const invoiceItems = [...items];

  // Try to find existing invoice to preserve discount if not explicitly provided
  let existingInvoice = await tx.invoice.findUnique({
    where: { bookingId: booking.id },
    include: { items: true }
  });

  let finalDiscount = discount;
  if (existingInvoice && finalDiscount === 0) {
    const discountItem = existingInvoice.items.find((i: any) => i.description === 'Discount');
    if (discountItem) {
      finalDiscount = Number(discountItem.amount) * -1; // amount is negative
    }
  }

  if (finalDiscount > 0) {
    invoiceItems.push({ description: 'Discount', amount: new Decimal(-finalDiscount) });
  }

  if (existingInvoice) {
    // Preserve the invoice's identity (same id / createdAt) — only replace its line items.
    await tx.invoiceItem.deleteMany({ where: { invoiceId: existingInvoice.id } });
    const updatedInvoice = await tx.invoice.update({
      where: { id: existingInvoice.id },
      data: {
        items: {
          create: invoiceItems.map(item => ({
            description: item.description,
            amount: item.amount
          }))
        }
      },
      include: { items: true }
    });
    
    // Sync booking amounts
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        subtotal: subTotal,
        tax: taxAmount,
        total: subTotal.plus(taxAmount).minus(finalDiscount)
      }
    });

    return updatedInvoice;
  }

  // No invoice yet — create one from scratch.
  const newInvoice = await tx.invoice.create({
    data: {
      bookingId: booking.id,
      items: {
        create: invoiceItems.map(item => ({
          description: item.description,
          amount: item.amount
        }))
      }
    },
    include: { items: true }
  });
  
  // Sync booking amounts
  await tx.booking.update({
    where: { id: booking.id },
    data: {
      subtotal: subTotal,
      tax: taxAmount,
      total: subTotal.plus(taxAmount).minus(finalDiscount)
    }
  });

  return newInvoice;
};

export const settlePayment = async (bookingId: string, amount: number | string, method: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ 
      where: { id: bookingId },
      include: {
        room: { include: { roomType: true } },
        guest: true, 
        foodOrders: { include: { items: true } },
        serviceOrders: { include: { items: true } },
        payments: true
      }
    });

    if (booking.status === 'CHECKED_OUT') {
      throw new Error('Booking is already checked out');
    }

    // Always regenerate invoice to capture any new food orders added since last check
    const invoice = await generateInvoice(tx, booking);

    const totalAmount = invoice.items.reduce((sum: Prisma.Decimal, i: any) => sum.plus(i.amount), new Decimal(0));
    const existingPaid = booking.payments.reduce((sum: Prisma.Decimal, p: any) => sum.plus(p.amount), new Decimal(0));
    const remainingAmount = totalAmount.minus(existingPaid);
    let finalAmount = new Decimal(amount);
    
    // Handle floating point rounding differences from UI (e.g. 135.795 displayed as 135.80)
    if (finalAmount.gt(remainingAmount)) {
      if (finalAmount.minus(remainingAmount).lte(0.02)) {
        finalAmount = remainingAmount;
      } else {
        const err: any = new Error('Payment amount exceeds total invoice amount');
        err.statusCode = 400;
        throw err;
      }
    }

    const payment = await tx.payment.create({
      data: { bookingId, amount: finalAmount, method }
    });

    const paidAmount = existingPaid.plus(finalAmount);

    let checkedOut = false;
    let updatedBooking = null;

    if (paidAmount.gte(totalAmount)) {
      updatedBooking = await checkOutBookingServiceTx(tx, bookingId, booking.roomId, totalAmount);
      checkedOut = true;
    }

    return { payment, checkedOut, updatedBooking, invoice };
  }, { isolationLevel: 'Serializable' });

  if (result.checkedOut && result.updatedBooking) {
    emitToHotel('main', 'booking:checked_out', { bookingId });
    emitToHotel('main', 'room:status_changed', { roomId: result.updatedBooking.roomId, newStatus: 'AVAILABLE' });

    const settings = await getPublicSettingsData();
    const currencySymbol = settings.currencySymbol;
    await notifyRoles(
      ['Admin', 'Manager', 'Receptionist'],
      'Check-out',
      'Guest checked out',
      `${result.updatedBooking.guest.name} has checked out of Room ${result.updatedBooking.room.number}.`,
      result.updatedBooking.id,
      {
        "Booking ID": result.updatedBooking.id.substring(0, 13).toUpperCase(),
        "Guest Name": result.updatedBooking.guest.name,
        "Room Number": result.updatedBooking.room.number,
        "Check-in Date": result.updatedBooking.checkIn.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Check-out Date": result.updatedBooking.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        "Total Amount": `${currencySymbol} ${result.updatedBooking.total.toNumber().toLocaleString()}`,
        "Created At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      }
    );
  }

  return result;
};
