import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { settlePayment } from '../services/billing.service';

export const processPayment = asyncHandler(async (req: Request, res: Response) => {
    const { bookingId, amount, method } = req.body;
    const paymentAmount = Number(amount);

    if (!bookingId || isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ message: 'Invalid payment details' });
    }

    // Delegate all invoice generation, payment creation, and checkout logic to the transactional service
    // Pass 'amount' as a string to preserve exact decimal precision when Prisma creates the record
    const result = await settlePayment(bookingId, String(amount), method || 'Cash');

    res.json({ payment: result.payment, checkedOut: result.checkedOut });
  });
