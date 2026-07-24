import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { getPagination, buildMeta } from '../utils/pagination';

// ─── GET /api/guests ────────────────────────────────────────────────────────
export const getGuests = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit, guestType } = req.query;
    const { skip, take, page: pageNumber } = getPagination(page, limit, 10);

    const where: any = {};
    if (guestType) {
      where.guestType = guestType;
    }
    
    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      where.OR = [
        { name: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
        { idNumber: { contains: s } },
      ];
    }

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { bookings: true }
          },
          bookings: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              status: true,
              checkIn: true,
              checkOut: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.guest.count({ where })
    ]);

    const formattedGuests = guests.map(g => {
      // Determine status based on latest booking
      let status = 'Inactive';
      let lastStay: Date | null = null;
      if (g.bookings.length > 0) {
        const latest = g.bookings[0];
        lastStay = latest.checkOut;
        if (latest.status === 'CHECKED_IN') {
          status = 'In-House';
        } else if (latest.status === 'CONFIRMED') {
          status = 'Confirmed';
        } else if (latest.status === 'CHECKED_OUT') {
          status = 'Checked-Out';
        }
      }

      return {
        id: g.id,
        guestType: g.guestType,
        name: g.name,
        phone: g.phone,
        email: g.email,
        nationality: g.nationality,
        city: g.city,
        country: g.country,
        idType: g.idType,
        idNumber: g.idNumber,
        address: g.address,
        notes: g.notes,
        totalStays: g._count.bookings,
        lastStay,
        status,
      };
    });

    res.json({
      data: formattedGuests,
      meta: buildMeta(total, pageNumber, take)
    });
  });

// ─── POST /api/guests ───────────────────────────────────────────────────────
export const createGuest = asyncHandler(async (req: Request, res: Response) => {
    const { guestType, name, email, phone, idType, idNumber, nationality, city, country, address, notes } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Check email uniqueness if provided
    if (email) {
      const existing = await prisma.guest.findUnique({ where: { email } });
      if (existing) {
        return res.status(409).json({ message: 'Email already exists' });
      }
    }

    const newGuest = await prisma.guest.create({
      data: {
        guestType: guestType || 'LOCAL',
        name,
        email: email || undefined, // prevent empty string uniqueness issues
        phone,
        idType,
        idNumber,
        nationality,
        city,
        country,
        address,
        notes
      }
    });

    res.status(201).json(newGuest);
  });

// ─── GET /api/guests/:id ────────────────────────────────────────────────────
export const getGuestById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: { createdAt: 'desc' },
          include: {
            room: { include: { roomType: true } },
            feedback: true,
            payments: true
          }
        }
      }
    });

    if (!guest) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    res.json(guest);
  });

// ─── PATCH /api/guests/:id ──────────────────────────────────────────────────
export const updateGuest = asyncHandler(async (req: Request, res: Response) => {
    const { guestType, name, email, phone, idType, idNumber, nationality, city, country, address, notes } = req.body;
    const id = req.params.id as string;

    // Email uniqueness check if email is changed
    if (email) {
      const existing = await prisma.guest.findFirst({ where: { email, id: { not: id } } });
      if (existing) {
        return res.status(409).json({ message: 'Email already in use by another guest' });
      }
    }

    const updated = await prisma.guest.update({
      where: { id },
      data: {
        guestType,
        name,
        email: email === '' ? null : email,
        phone,
        idType,
        idNumber,
        nationality,
        city,
        country,
        address,
        notes
      }
    });

    res.json(updated);
  });

// ─── DELETE /api/guests/:id ─────────────────────────────────────────────────
export const deleteGuest = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const bookingCount = await prisma.booking.count({
      where: { guestId: id }
    });

    if (bookingCount > 0) {
      return res.status(409).json({ 
        message: 'Cannot delete guest because they have existing bookings. Please anonymize the guest instead if required by data policies.' 
      });
    }

    const guestExists = await prisma.guest.findUnique({ where: { id } });
    if (!guestExists) {
      return res.status(404).json({ message: 'Guest not found' });
    }

    await prisma.guest.delete({ where: { id } });
    res.json({ message: 'Guest deleted successfully' });
  });
