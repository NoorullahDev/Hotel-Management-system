import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { emitToHotel } from '../socket';
import { notifyRoles } from '../services/notificationService';

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
        const updatedRoom = await prisma.room.update({
          where: { id: task.roomId },
          data: { status: 'AVAILABLE' }
        });
        
        emitToHotel('main', 'room:status_changed', {
          roomId: task.roomId,
          newStatus: 'AVAILABLE'
        });

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
