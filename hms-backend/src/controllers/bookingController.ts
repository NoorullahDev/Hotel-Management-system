import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../prisma';
import { createBookingService, checkInBookingService } from '../services/booking.service';
import { getTaxSettings, getPublicSettingsData } from '../utils/settings';
import { Prisma } from '@prisma/client';
const { Decimal } = Prisma;
import { generateInvoice, computeInvoiceLineItems } from '../services/billing.service';
import { getPagination, buildMeta } from '../utils/pagination';
import { emitToHotel } from '../socket';

export const getBookings = asyncHandler(async (req: Request, res: Response) => {
    const {
      limit: limitStr,
      page,
      sort,
      bookingType,
      status,
      search,
      startDate,
      endDate,
    } = req.query;
    const { skip, take: limit, page: pageNumber } = getPagination(page, limitStr, 50, 500);
    const orderDir = sort === 'asc' ? 'asc' : 'desc';

    const where: any = {};
    if (bookingType) where.bookingType = bookingType;
    if (status)      where.status      = status;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const sd = new Date(startDate as string); sd.setHours(0, 0, 0, 0);
        where.createdAt.gte = sd;
      }
      if (endDate) {
        const ed = new Date(endDate as string); ed.setHours(23, 59, 59, 999);
        where.createdAt.lte = ed;
      }
    }

    if (search && typeof search === 'string' && search.trim()) {
      const s = search.trim();
      where.OR = [
        { guest: { name: { contains: s } } },
        { room:  { number: { contains: s } } },
        { id:    { contains: s } },
      ];
    }

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [bookings, total, statGroups, dailyPaymentAggr, monthlyPaymentAggr, yearlyPaymentAggr] = await Promise.all([
      prisma.booking.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: orderDir },
        include: {
          guest: true,
          room: { include: { roomType: true } },
        }
      }),
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
        _sum: { total: true }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfDay } }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfMonth } }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: startOfYear } }
      })
    ]);

    const settings = await getPublicSettingsData();

    let totalRev = 0;
    let paid = 0;
    let pendingPay = 0;
    let invoices = 0;

    statGroups.forEach(g => {
      const amt = g._sum.total ? g._sum.total.toNumber() : 0;
      const count = g._count._all;
      if (g.status === 'CHECKED_OUT') {
        totalRev += amt;
        paid += amt;
        invoices += count;
      } else if (g.status === 'CHECKED_IN') {
        totalRev += amt;
        pendingPay += amt;
        invoices += count;
      }
    });

    const dailyRevenue = dailyPaymentAggr._sum.amount ? dailyPaymentAggr._sum.amount.toNumber() : 0;
    const monthlyRevenue = monthlyPaymentAggr._sum.amount ? monthlyPaymentAggr._sum.amount.toNumber() : 0;
    const yearlyRevenue = yearlyPaymentAggr._sum.amount ? yearlyPaymentAggr._sum.amount.toNumber() : 0;

    const stats = {
      totalRevenue: totalRev,
      dailyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      pendingPayments: pendingPay,
      totalInvoices: invoices,
      paidBills: paid
    };

    const formattedBookings = bookings.map(b => {
      const checkInStr  = b.checkIn.toLocaleDateString('en-US',  { month: 'short', day: 'numeric', year: 'numeric' });
      const checkOutStr = b.checkOut.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return {
        id:          b.id.substring(0, 13).toUpperCase(),
        rawId:       b.id,
        room:        b.room.number,
        roomType:    b.room.roomType.name,
        guest:       b.guest.name,
        guestPhone:  b.guest.phone,
        guestEmail:  b.guest.email,
        guestType:   b.guest.guestType,
        bookingType: b.bookingType,
        dates:       `${checkInStr} - ${checkOutStr}`,
        days:        Math.max(1, Math.ceil((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24))),
        checkIn:     b.checkIn,
        checkOut:    b.checkOut,
        createdAt:   b.createdAt,
        status:      b.status,
        amount:      `${settings.currencySymbol} ${b.total.toNumber().toLocaleString()}`,
        rawAmount:   b.total.toNumber(),
      };
    });

    res.json({
      data: formattedBookings,
      meta: buildMeta(total, pageNumber, limit),
      stats
    });
  });


export const createBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { guest, bookingType, arrivalTime, additionalGuests, roomId, checkIn, checkOut, guestCount, subtotal, tax, total, paymentMethod } = req.body;
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    // Upsert guest based on id, or email, or create
    let dbGuest;
    if (guest.id) {
      dbGuest = await prisma.guest.update({
        where: { id: guest.id },
        data: {
          guestType: guest.guestType,
          name: guest.name,
          phone: guest.phone,
          idType: guest.idType,
          idNumber: guest.idNumber,
          nationality: guest.nationality,
          city: guest.city,
          country: guest.country
        }
      });
    } else if (guest.email && guest.email.trim() !== '') {
      dbGuest = await prisma.guest.upsert({
        where: { email: guest.email },
        update: {
          guestType: guest.guestType,
          name: guest.name,
          phone: guest.phone,
          idType: guest.idType,
          idNumber: guest.idNumber,
          nationality: guest.nationality,
          city: guest.city,
          country: guest.country
        },
        create: {
          guestType: guest.guestType || (bookingType === 'FOREIGN' ? 'FOREIGN' : 'LOCAL'),
          name: guest.name,
          email: guest.email,
          phone: guest.phone,
          idType: guest.idType,
          idNumber: guest.idNumber,
          nationality: guest.nationality,
          city: guest.city,
          country: guest.country
        }
      });
    } else {
      dbGuest = await prisma.guest.create({
        data: {
          guestType: guest.guestType || (bookingType === 'FOREIGN' ? 'FOREIGN' : 'LOCAL'),
          name: guest.name,
          phone: guest.phone,
          idType: guest.idType,
          idNumber: guest.idNumber,
          nationality: guest.nationality,
          city: guest.city,
          country: guest.country
        }
      });
    }

    // Create booking. This will trigger the PostgreSQL exclusion constraint if there's an overlap.
    const newBooking = await createBookingService({
      bookingType: bookingType || 'LOCAL',
      guestId: dbGuest.id,
      roomId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      arrivalTime: arrivalTime ? new Date(arrivalTime) : undefined,
      guestCount: parseInt(guestCount) || 1,
      additionalGuests: additionalGuests || null,
      // subtotal/tax/total default to 0 — actual amounts are calculated at Check-Out via Billing module
      subtotal: subtotal ?? 0,
      tax: tax ?? 0,
      total: total ?? 0,
      status: 'CONFIRMED',
      ...(total !== undefined && paymentMethod ? {
        payments: {
          create: {
            amount: total,
            method: paymentMethod
          }
        }
      } : {})
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_BOOKING',
        module: 'Booking',
        details: `Created booking ${newBooking.id} for guest ${dbGuest.name}`,
      }
    });

    res.status(201).json(newBooking);
  });

export const getBookingById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: {
          include: {
            bookings: {
              include: { room: { include: { roomType: true } } },
              orderBy: { checkIn: 'desc' }
            }
          }
        },
        room: { include: { roomType: true } },
        payments: true
      }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  });

export const updateBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { status, guestCount, checkIn, checkOut, roomId, arrivalTime } = req.body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (guestCount) dataToUpdate.guestCount = guestCount;
    if (checkIn) dataToUpdate.checkIn = new Date(checkIn);
    if (checkOut) dataToUpdate.checkOut = new Date(checkOut);
    if (roomId) dataToUpdate.roomId = roomId;
    if (arrivalTime) dataToUpdate.arrivalTime = new Date(arrivalTime);

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: dataToUpdate
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_BOOKING',
        module: 'Booking',
        details: `Updated booking ${id}`,
      }
    });

    res.json(updatedBooking);
  });

export const cancelBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' }
      });

      const room = await tx.room.findUnique({ where: { id: booking.roomId } });
      if (room?.status === 'RESERVED') {
        await tx.room.update({
          where: { id: booking.roomId },
          data: { status: 'AVAILABLE' }
        });
      }

      return { updated, roomWasReserved: room?.status === 'RESERVED' };
    });

    // Emit real-time room availability update if room was reverted to AVAILABLE
    if (updatedBooking.roomWasReserved) {
      emitToHotel('main', 'room:status_changed', { roomId: booking.roomId, newStatus: 'AVAILABLE' });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CANCEL_BOOKING',
        module: 'Booking',
        details: `Cancelled booking ${id}`,
      }
    });

    res.json(updatedBooking.updated);
  });

export const deleteBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    // The schema defines onDelete: Cascade on Payment, Invoice (→InvoiceItem),
    // FoodOrder (→OrderItem), and Feedback relations, so a single delete
    // removes all child records atomically via the DB engine.
    const booking = await prisma.booking.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_BOOKING',
        module: 'Booking',
        details: `Deleted booking ${id}`,
      }
    });

    res.json(booking);
  });

export const checkInBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Transaction to update booking and room
    const result = await checkInBookingService(id, booking.roomId);

    res.json(result[0]);
  });

export const getFolio = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        payments: true,
        foodOrders: { include: { items: true } },
        serviceOrders: { include: { items: true } }
      }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Calculate nights
    // Compute line items using shared logic
    const tax = await getTaxSettings();
    const { items, subTotal, taxAmount } = computeInvoiceLineItems(booking, tax.rate, tax.name, tax.pct);

    // Existing invoice discount
    let existingInvoice = await prisma.invoice.findUnique({
      where: { bookingId: id },
      include: { items: true }
    });

    let discount = new Decimal(0);
    if (existingInvoice) {
       const discountItem = existingInvoice.items.find(i => i.description === 'Discount');
       if (discountItem) {
         discount = discountItem.amount.mul(-1);
       }
    }

    const totalAmount = subTotal.plus(taxAmount).minus(discount);
    const paidAmount = booking.payments.reduce((sum, p) => sum.plus(p.amount), new Decimal(0));
    const balanceDue = totalAmount.minus(paidAmount);

    res.json({
      bookingId: booking.id,
      guestName: booking.guest.name,
      roomNumber: booking.room.number,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      items: items.map(i => ({ ...i, amount: i.amount.toNumber() })),
      subTotal: subTotal.toNumber(),
      taxAmount: taxAmount.toNumber(),
      discount: discount.toNumber(),
      totalAmount: totalAmount.toNumber(),
      paidAmount: paidAmount.toNumber(),
      balanceDue: balanceDue.toNumber(),
      payments: booking.payments.map(p => ({ ...p, amount: p.amount.toNumber() })),
      hasInvoice: !!existingInvoice
    });

  });

export const checkoutBooking = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { discount } = req.body;
    
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        room: { include: { roomType: true } },
        guest: true,
        foodOrders: { include: { items: true } },
        serviceOrders: { include: { items: true } }
      }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // If invoice exists, don't recreate it
    let invoice = await prisma.invoice.findUnique({ where: { bookingId: id } });
    if (!invoice) {
      invoice = await generateInvoice(prisma, booking, Number(discount) || 0);
    }

    res.json(invoice);
  });
