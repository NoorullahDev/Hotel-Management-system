import prisma from '../prisma';
import { checkOutBookingServiceTx } from './booking.service';
import { getTaxSettings, getPublicSettingsData } from '../utils/settings';
import { emitToHotel } from '../socket';
import { notifyRoles } from './notificationService';

import { Prisma } from '@prisma/client';
const { Decimal } = Prisma;

export const computeInvoiceLineItems = (booking: any, taxRate: number, taxName: string, taxPct: number) => {
  const checkInDate = new Date(booking.checkIn);
  const checkOutDate = new Date(booking.checkOut);
  const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000));
  
  const invoiceItems: { description: string, qty?: number, rate?: Decimal, amount: Decimal }[] = [];
  
  const totalRoomCharges = booking.room.price.mul(nights);
  invoiceItems.push({ 
    description: `Room Charges (${nights} nights)`, 
    qty: nights,
    rate: booking.room.price,
    amount: totalRoomCharges 
  });
  
  let totalFoodCharges = new Decimal(0);
  for (const order of booking.foodOrders) {
    for (const item of order.items) {
      const itemTotal = item.price.mul(item.quantity);
      totalFoodCharges = totalFoodCharges.plus(itemTotal);
      invoiceItems.push({ 
        description: `Restaurant (${item.itemName} x${item.quantity})`, 
        qty: item.quantity,
        rate: item.price,
        amount: itemTotal 
      });
    }
  }

  const subTotal = totalRoomCharges.plus(totalFoodCharges);
  const taxAmount = subTotal.mul(taxRate);
  
  invoiceItems.push({ description: `${taxName} (${taxPct}%)`, amount: taxAmount });

  return { items: invoiceItems, subTotal, taxAmount, nights };
};

// Shared invoice generation logic
export const generateInvoice = async (tx: any, booking: any, discount: number = 0) => {
  const tax = await getTaxSettings();
  const { items } = computeInvoiceLineItems(booking, tax.rate, tax.name, tax.pct);
  
  // Clone to avoid mutating the original if reused
  const invoiceItems = [...items];

  if (discount > 0) {
    invoiceItems.push({ description: 'Discount', amount: new Decimal(-discount) });
  }

  return tx.invoice.create({
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
};

export const settlePayment = async (bookingId: string, amount: number | string, method: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ 
      where: { id: bookingId },
      include: {
        room: { include: { roomType: true } },
        foodOrders: { include: { items: true } },
        payments: true
      }
    });

    let invoice = await tx.invoice.findUnique({ 
      where: { bookingId }, 
      include: { items: true } 
    });

    // Guarantee an invoice exists — don't rely on a prior separate call.
    if (!invoice) {
      invoice = await generateInvoice(tx, booking);
    }

    const payment = await tx.payment.create({
      data: { bookingId, amount, method }
    });

    const totalAmount = invoice.items.reduce((sum: Decimal, i: any) => sum.plus(i.amount), new Decimal(0));
    const paidAmount = [...booking.payments, payment].reduce((sum: Decimal, p: any) => sum.plus(p.amount), new Decimal(0));

    let checkedOut = false;
    let updatedBooking = null;

    if (paidAmount.gte(totalAmount)) {
      updatedBooking = await checkOutBookingServiceTx(tx, bookingId, booking.roomId);
      checkedOut = true;
    }

    return { payment, checkedOut, updatedBooking, invoice };
  });

  if (result.checkedOut && result.updatedBooking) {
    emitToHotel('main', 'booking:checked_out', { bookingId });
    emitToHotel('main', 'room:status_changed', { roomId: result.updatedBooking.roomId, newStatus: 'CLEANING' });

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
