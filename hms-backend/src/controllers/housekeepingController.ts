import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { emitToHotel } from '../socket';
import { notifyRoles } from '../services/notificationService';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { createStaffAccount } from '../services/staff.service';

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
    const { status, assignedStaffId } = req.query;

    const filter: any = {};
    if (status) filter.status = String(status);
    if (assignedStaffId) filter.staffId = String(assignedStaffId);

    const tasks = await prisma.housekeepingTask.findMany({
      where: filter,
      include: {
        room: true,
        staff: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  });

export const getStaff = asyncHandler(async (req: Request, res: Response) => {
    const staff = await prisma.staff.findMany({
      where: { department: 'Housekeeping' },
      include: { user: true }
    });
    res.json(staff);
  });

export const createTask = asyncHandler(async (req: Request, res: Response) => {
    const { roomId, area, staffId, priority, taskType, estimatedTime, scheduledDate, notes } = req.body;
    
    // Create new task
    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: roomId || null,
        area: area || null,
        staffId: staffId || null,
        priority: priority || 'Medium',
        taskType: taskType || 'Cleaning',
        estimatedTime: estimatedTime || 30,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes: notes || null,
        status: staffId ? 'ASSIGNED' : 'PENDING',
      },
      include: { room: true }
    });

    if (task.room && task.room.status === 'AVAILABLE') {
      await prisma.room.update({ where: { id: task.roomId as string }, data: { status: 'CLEANING' } });
      emitToHotel('main', 'room:status_changed', { roomId: task.roomId, newStatus: 'CLEANING' });
    }

    res.json(task);
  });

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { staffId, status } = req.body;

    const data: any = {};
    if (staffId !== undefined) data.staffId = staffId;
    if (status) {
      data.status = status;
      if (status === 'IN_PROGRESS') data.startedAt = new Date();
      if (status === 'COMPLETED') data.completedAt = new Date();
      if (status === 'INSPECTED') data.inspectedAt = new Date();
    }

    const task: any = await prisma.housekeepingTask.update({
      where: { id: String(id) },
      data,
      include: {
        room: true
      }
    });

    // If marked completed, update room status to AVAILABLE if it was CLEANING
    if (status === 'COMPLETED' || status === 'INSPECTED') {
      if (task.roomId && task.room && task.room.status === 'CLEANING') {
        const pendingTasks = await prisma.housekeepingTask.findFirst({
          where: { 
            roomId: task.roomId, 
            status: { notIn: ['COMPLETED', 'INSPECTED'] },
            id: { not: task.id } // Exclude the task currently being completed
          }
        });

        if (!pendingTasks) {
          const updatedRoom = await prisma.room.update({
            where: { id: task.roomId },
            data: { status: 'AVAILABLE' }
          });
          
          emitToHotel('main', 'room:status_changed', {
            roomId: task.roomId,
            newStatus: 'AVAILABLE'
          });
        }

        await notifyRoles(
          ['Admin', 'Manager', 'Receptionist'],
          'Housekeeping',
          'Room cleaning completed',
          `Housekeeping completed cleaning for Room ${task.room.number}.`,
          task.roomId,
          {
            "Room Number": task.room.number,
            "Task Type": task.taskType,
            "Priority": task.priority,
            "Completed At": new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
          }
        );
      }
    }

    res.json(task);
  });

export const createHousekeepingStaff = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, phone, role, status } = req.body;

  if (!name || !role || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const finalEmail = email ? String(email).trim().toLowerCase() : undefined;
  let newStaff: any;
  try {
    newStaff = await prisma.$transaction(async (tx) => {
      return await createStaffAccount(tx, {
        name: String(name),
        email: email ? String(email) : undefined,
        phone: phone ? String(phone) : undefined,
        department: 'Housekeeping',
        role: String(role),
        shift: 'Morning (8AM - 4PM)',
        status: String(status),
        hireDate: new Date(),
      });
    });
  } catch (error: any) {
    if (error.message.includes('already exists') || error.message.includes('not configured')) {
      return res.status(error.message.includes('already exists') ? 400 : 500).json({ message: error.message });
    }
    throw error;
  }

  res.status(201).json({ message: 'Housekeeping staff created successfully', id: newStaff.staff.id, temporaryPassword: newStaff.temporaryPassword });
});

// --- Services CRUD ---

export const getServices = asyncHandler(async (req: Request, res: Response) => {
  const { category } = req.query;
  const where: any = {};
  if (category) {
    where.category = String(category);
  }
  const services = await prisma.housekeepingService.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
  res.json(services);
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const { category, name, price, isActive } = req.body;
  if (!category || !name || price === undefined) {
    return res.status(400).json({ message: 'Category, name, and price are required' });
  }
  const service = await prisma.housekeepingService.create({
    data: {
      category,
      name,
      price,
      isActive: isActive !== undefined ? isActive : true
    }
  });
  res.json(service);
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, price, isActive } = req.body;
  const service = await prisma.housekeepingService.update({
    where: { id: String(id) },
    data: { name, price, isActive }
  });
  res.json(service);
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.housekeepingService.delete({
    where: { id: String(id) }
  });
  res.json({ message: 'Service deleted successfully' });
});

// --- Service Orders (Billing) ---

export const createServiceOrder = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId, items } = req.body;
  if (!bookingId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'bookingId and items are required' });
  }

  // Calculate total amount
  let calculatedTotal = 0;
  for (const item of items) {
    calculatedTotal += (Number(item.price) * Number(item.quantity));
  }

  const serviceOrder = await prisma.serviceOrder.create({
    data: {
      bookingId: String(bookingId),
      totalAmount: calculatedTotal,
      items: {
        create: items.map((item: any) => ({
          serviceName: item.serviceName,
          category: item.category,
          quantity: Number(item.quantity),
          price: Number(item.price)
        }))
      }
    },
    include: { items: true }
  });

  res.status(201).json(serviceOrder);
});

export const getServiceOrders = asyncHandler(async (req: Request, res: Response) => {
  const { bookingId } = req.query;
  const where: any = {};
  if (bookingId) {
    where.bookingId = String(bookingId);
  }
  const orders = await prisma.serviceOrder.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
});
