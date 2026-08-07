import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { emitToHotel } from '../socket';
import { notifyRoles } from '../services/notificationService';
import { getPagination, buildMeta } from '../utils/pagination';
import { Prisma } from '@prisma/client';

export const getOrders = asyncHandler(async (req: Request, res: Response) => {
    const { limit, page, search, status, startDate, endDate } = req.query as any;

    const { skip, take, page: pageNumber } = getPagination(page, limit, 50, 500);

    const where: any = {};
    if (status) where.status = status;

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
        { booking: { guest: { name: { contains: s } } } },
        { booking: { room:  { number: { contains: s } } } },
        { orderNumber: { contains: s } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.foodOrder.findMany({
        where,
        include: {
          booking: { include: { guest: true, room: true } },
          items: true
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.foodOrder.count({ where }),
    ]);

    res.json({ data: orders, meta: buildMeta(total, pageNumber, take) });
  });

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
    const { roomNumber, bookingId: directBookingId, items, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'items are required' });
    }

    let booking: any = null;
    let room: any = null;

    if (directBookingId) {
      // Admin selected a room from dropdown — booking ID supplied directly
      booking = await prisma.booking.findUnique({
        where: { id: String(directBookingId) },
        include: { room: true }
      });
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.status !== 'CHECKED_IN') {
        return res.status(400).json({ message: 'Booking is not currently checked in' });
      }
      room = booking.room;
    } else if (roomNumber) {
      // Legacy path — find active booking by room number
      room = await prisma.room.findUnique({ where: { number: String(roomNumber) } });
      if (!room) return res.status(404).json({ message: 'Room not found' });

      booking = await prisma.booking.findFirst({
        where: { roomId: room.id, status: 'CHECKED_IN' }
      });

      if (!booking) {
        return res.status(400).json({ message: 'No active CHECKED_IN booking found for this room' });
      }
    } else {
      return res.status(400).json({ message: 'roomNumber or bookingId is required' });
    }

    let hasInvalidQuantity = false;
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData = items.map((item: any) => {
      const price = new Prisma.Decimal(item.price);
      const quantity = parseInt(item.quantity, 10);
      
      if (isNaN(quantity) || quantity <= 0) {
        hasInvalidQuantity = true;
      }
      
      totalAmount = totalAmount.plus(price.mul(quantity));
      return {
        itemName: item.name,
        quantity,
        price
      };
    });

    if (hasInvalidQuantity) {
      return res.status(400).json({ message: 'Item quantity must be greater than zero' });
    }

    const order = await prisma.foodOrder.create({
      data: {
        bookingId: booking.id,
        status: 'Served',
        notes: notes || null,
        totalAmount,
        items: {
          create: orderItemsData
        }
      },
      include: {
        booking: {
          include: { guest: true, room: true }
        },
        items: true
      }
    });

    emitToHotel('main', 'order:created', order);

    await notifyRoles(
      ['Admin', 'Manager', 'Restaurant'],
      'Food Order',
      'New food order',
      `A new food order has been placed for Room ${room.number}.`,
      order.id,
      {
        "Order Number": order.orderNumber,
        "Booking ID": order.booking.id.substring(0, 13).toUpperCase(),
        "Guest Name": order.booking.guest.name,
        "Room Number": room.number,
        "Total Amount": `Rs. ${totalAmount}`,
        "Items Count": items.length.toString(),
        "Created At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
      }
    );

    res.status(201).json(order);
  });

export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Preparing', 'Ready', 'Served'];
    if (!validStatuses.includes(String(status))) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const data: any = { status };
    if (status === 'Preparing') data.preparingAt = new Date();
    if (status === 'Ready') data.readyAt = new Date();
    if (status === 'Served') data.servedAt = new Date();
    if (status === 'Pending') data.acceptedAt = new Date();

    const order = await prisma.foodOrder.update({
      where: { id: String(id) },
      data,
      include: {
        booking: { include: { guest: true, room: true } },
        items: true
      }
    });

    emitToHotel('main', 'order:status_changed', { orderId: order.id, status: order.status, order });

    res.json(order);
  });

export const getMenuItems = asyncHandler(async (req: Request, res: Response) => {
    const items = await prisma.menuItem.findMany({
      orderBy: { category: 'asc' }
    });
    res.json(items);
  });

export const verifyGuest = asyncHandler(async (req: Request, res: Response) => {
    const { roomNumber, lastName } = req.body;
    
    // Find active booking for this room
    const room = await prisma.room.findUnique({
      where: { number: roomNumber },
      include: {
        bookings: {
          where: { status: 'CHECKED_IN' },
          include: { guest: true }
        }
      }
    });

    if (!room || room.bookings.length === 0) {
      return res.status(404).json({ message: 'No active booking found for this room' });
    }

    const activeBooking = room.bookings[0];
    const guestName = activeBooking.guest.name.toLowerCase();

    if (guestName.includes(lastName.toLowerCase())) {
      res.json({ verified: true, guest: activeBooking.guest, bookingId: activeBooking.id });
    } else {
      res.status(401).json({ message: 'Name does not match the active booking' });
    }
  });

export const createMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { name, category, price, imageUrl, description, preparationTime, isAvailable } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }

    const numPrepTime = preparationTime !== undefined && preparationTime !== '' ? parseInt(preparationTime, 10) : null;

    const item = await prisma.menuItem.create({
      data: {
        name: name.trim(),
        category,
        price: numPrice,
        imageUrl: imageUrl || null,
        description: description?.trim() || null,
        preparationTime: numPrepTime,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      }
    });
    res.status(201).json(item);
  });

export const updateMenuItem = asyncHandler(async (req: Request, res: Response) => {
    const { name, category, price, imageUrl, description, preparationTime, isAvailable } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ message: 'Price must be a valid positive number' });
    }

    const numPrepTime = preparationTime !== undefined && preparationTime !== '' ? parseInt(preparationTime, 10) : null;

    const item = await prisma.menuItem.update({
      where: { id: String(req.params.id) },
      data: {
        name: name.trim(),
        category,
        price: numPrice,
        imageUrl: imageUrl || null,
        description: description?.trim() || null,
        preparationTime: numPrepTime,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      }
    });
    res.json(item);
  });

export const deleteMenuItem = asyncHandler(async (req: Request, res: Response) => {
    await prisma.menuItem.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Menu item deleted' });
  });

export const getCategories = asyncHandler(async (req: Request, res: Response) => {
    const categories = await prisma.menuCategory.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(categories);
  });

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }

    const category = await prisma.menuCategory.create({
      data: { name: name.trim() }
    });
    res.status(201).json(category);
  });

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    await prisma.menuCategory.delete({ where: { id: String(req.params.id) } });
    res.json({ message: 'Category deleted' });
  });
