import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../prisma';
import { updateRoomStatus as updateRoomStatusService, logRoomMaintenance as logRoomMaintenanceService } from '../services/room.service';
import { getPagination, buildMeta } from '../utils/pagination';

export const getRoomsStatusGrid = asyncHandler(async (req: Request, res: Response) => {
    const rooms = await prisma.room.findMany({
      orderBy: { number: 'asc' },
      select: {
        id: true,
        number: true,
        status: true,
      }
    });

    const formattedRooms = rooms.map(r => {
      let statusStr = 'Available';
      if (r.status === 'OCCUPIED') statusStr = 'Occupied';
      if (r.status === 'RESERVED') statusStr = 'Reserved';
      if (r.status === 'CLEANING') statusStr = 'Cleaning';
      if (r.status === 'MAINTENANCE') statusStr = 'Maintenance';

      return {
        id: r.id,
        number: r.number,
        status: statusStr,
      };
    });

    res.json(formattedRooms);
  });

// --- New Endpoints ---

export const getRoomsAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { checkIn, checkOut, roomType, guests } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({ message: 'checkIn and checkOut dates are required' });
    }

    const checkInDate = new Date(checkIn as string);
    const checkOutDate = new Date(checkOut as string);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({ message: 'Invalid dates' });
    }

    const where: any = {
      status: { notIn: ['MAINTENANCE'] }, // Allow any room not in maintenance, as long as there is no overlapping booking
      bookings: {
        none: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } }
          ]
        }
      }
    };

    if (roomType && roomType !== 'All Types' && roomType !== '') {
      where.roomTypeId = roomType;
    }

    // We don't have a maxGuests field on Room, but if we did, we could filter by it.
    // Assuming room types dictate capacity, we'll just ignore guests filter for now as it's not in the schema.

    const rooms = await prisma.room.findMany({
      where,
      include: { roomType: true },
      orderBy: { number: 'asc' }
    });

    res.json(rooms);
  });

export const getRoomById = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const room = await prisma.room.findUnique({
      where: { id },
      include: { roomType: true }
    });
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.json(room);
  });

export const getRooms = asyncHandler(async (req: Request, res: Response) => {
    const { status, roomTypeId, floor, search, page, limit } = req.query as any;

    const { skip, take: limitNumber, page: pageNumber } = getPagination(page, limit, 12, 500);

    const where: any = {};

    if (status && status !== 'All Status') {
      where.status = (status as string).toUpperCase();
    }
    if (roomTypeId && roomTypeId !== 'All Types') {
      where.roomTypeId = roomTypeId;
    }
    if (floor && floor !== 'All Floors') {
      where.floor = parseInt(floor as string, 10);
    }
    if (search) {
      where.OR = [
        { number: { contains: search as string } },
        { roomType: { name: { contains: search as string } } }
      ];
    }

    const [rooms, totalCount, total, statGroups] = await Promise.all([
      prisma.room.findMany({
        where,
        include: { roomType: true },
        orderBy: { number: 'asc' },
        skip,
        take: limitNumber,
      }),
      prisma.room.count({ where }),
      prisma.room.count(),
      prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    // Collapse status counts from groupBy (1 query vs 5 separate counts)
    const byStatus = Object.fromEntries(
      statGroups.map(g => [g.status, g._count._all])
    );

    res.json({
      data: rooms,
      meta: buildMeta(totalCount, pageNumber, limitNumber),
      stats: {
        total,
        available:   byStatus['AVAILABLE']   ?? 0,
        occupied:    byStatus['OCCUPIED']     ?? 0,
        reserved:    byStatus['RESERVED']     ?? 0,
        cleaning:    byStatus['CLEANING']     ?? 0,
        maintenance: byStatus['MAINTENANCE']  ?? 0,
      },
    });
  });

export const createRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { number, floor, roomTypeId, price, amenities } = req.body;
    
    if (price === undefined || price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than zero' });
    }
    
    const parsedFloor = parseInt(floor);
    if (isNaN(parsedFloor)) {
      return res.status(400).json({ message: 'Floor must be a valid number' });
    }
    
    // Check if room number already exists
    const existing = await prisma.room.findUnique({ where: { number } });
    if (existing) {
      return res.status(400).json({ message: 'Room number already exists' });
    }

    const newRoom = await prisma.room.create({
      data: {
        number,
        floor: parsedFloor,
        roomTypeId,
        price,
        amenities: JSON.stringify(amenities || []),
        imageUrl: req.body.imageUrl,
        status: 'AVAILABLE'
      },
      include: { roomType: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_ROOM',
        module: 'Room Management',
        details: `Created room ${number}`,
      }
    });

    res.status(201).json(newRoom);
  });

export const updateRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { number, floor, roomTypeId, price, amenities, imageUrl, status } = req.body;

    if (price !== undefined && price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than zero' });
    }

    let parsedFloor: number | undefined;
    if (floor !== undefined) {
      parsedFloor = parseInt(floor);
      if (isNaN(parsedFloor)) {
        return res.status(400).json({ message: 'Floor must be a valid number' });
      }
    }

    if (number) {
      const existing = await prisma.room.findFirst({ where: { number, id: { not: id } } });
      if (existing) {
        return res.status(400).json({ message: 'Room number already exists' });
      }
    }

    if (status === 'AVAILABLE') {
      const pendingTask = await prisma.housekeepingTask.findFirst({
        where: { roomId: id, status: { notIn: ['COMPLETED', 'INSPECTED'] } }
      });
      if (pendingTask) {
        return res.status(400).json({ message: 'Cannot mark room as AVAILABLE while there are pending housekeeping tasks' });
      }
    }

    const updatedRoom = await prisma.room.update({
      where: { id },
      data: {
        number,
        floor: parsedFloor,
        roomTypeId,
        price,
        amenities: amenities !== undefined ? JSON.stringify(amenities) : undefined,
        imageUrl,
        status
      },
      include: { roomType: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_ROOM',
        module: 'Room Management',
        details: `Updated room ${updatedRoom.number}`,
      }
    });

    res.json(updatedRoom);
  });

export const updateRoomStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid room status' });
    }

    const updatedRoom = await updateRoomStatusService(id, status);

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_ROOM_STATUS',
        module: 'Room Management',
        details: `Updated room ${updatedRoom.number} status to ${status}`,
      }
    });

    res.json(updatedRoom);
  });

export const logRoomMaintenance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;
    const { description } = req.body;

    await logRoomMaintenanceService(id, description);

    res.status(201).json({ message: 'Maintenance logged successfully' });
  });

export const deleteRoom = asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = req.params.id as string;

    // Optional: check if room has active bookings before deleting
    const activeBookings = await prisma.booking.findFirst({
      where: {
        roomId: id,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] }
      }
    });

    if (activeBookings) {
      return res.status(400).json({ message: 'Cannot delete room with active bookings' });
    }

    const anyBooking = await prisma.booking.findFirst({
      where: { roomId: id }
    });

    if (anyBooking) {
      return res.status(400).json({ message: 'Cannot delete room with booking history. Please set status to Maintenance instead.' });
    }

    await prisma.room.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_ROOM',
        module: 'Room Management',
        details: `Deleted room ${id}`,
      }
    });

    res.json({ message: 'Room deleted successfully' });
  });

export const getRoomTypes = asyncHandler(async (req: Request, res: Response) => {
    const types = await prisma.roomType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(types);
  });

export const createRoomType = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name } = req.body;
    const newType = await prisma.roomType.create({
      data: { name }
    });
    res.status(201).json(newType);
  });
