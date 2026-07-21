import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { checkOutBookingService } from '../services/booking.service';

export const processPayment = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, amount, method } = req.body;
    const paymentAmount = Number(amount);

    if (!bookingId || isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment details' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Step 1: Create the payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amount: paymentAmount,
        method: method || 'Cash'
      }
    });

    // Step 2: Check if this payment completes the balance
    // Re-calculate folio from DB to be completely accurate, or rely on invoice if it exists.
    let invoice = await prisma.invoice.findUnique({
      where: { bookingId },
      include: { items: true }
    });

    if (invoice) {
      const totalAmount = invoice.items.reduce((sum, item) => sum + item.amount.toNumber(), 0);
      const allPayments = [...booking.payments, payment];
      const paidAmount = allPayments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

      // If fully paid, trigger Check-Out sequence in a transaction
      if (paidAmount >= totalAmount - 0.01) { // -0.01 to handle float rounding
        await checkOutBookingService(bookingId, booking.roomId);
        return res.json({ payment, checkedOut: true });
      }
    }

    res.json({ payment, checkedOut: false });
  });
