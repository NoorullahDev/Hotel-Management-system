import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { createStaffAccount } from '../services/staff.service';

type TxClient = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

// Extended Staff type to include new fields not yet in cached Prisma types
type StaffWithUser = {
  id: string;
  userId: string;
  employeeId: string | null;
  role: string | null;
  department: string;
  shift: string | null;
  attendance: number | null;
  hireDate: Date;
  status: string;
  user: {
    name: string;
    username: string;
    email: string;
    phone: string | null;
    role: {
      name: string;
    };
  };
};

// Get all staff
export const getAllStaff = asyncHandler(async (req: Request, res: Response) => {
    const staff = (await prisma.staff.findMany({
      include: {
        user: {
          select: {
            name: true,
            username: true,
            email: true,
            phone: true,
            role: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        hireDate: 'desc'
      }
    })) as unknown as StaffWithUser[];

    const formattedStaff = staff.map(s => ({
      id: s.id,
      employeeId: s.employeeId,
      name: s.user?.name || 'Unknown',
      username: s.user?.username || '',
      email: s.user?.email || '',
      phone: s.user?.phone || '',
      department: s.department,
      role: s.role,
      systemRole: s.user?.role?.name || 'User',
      shift: s.shift,
      attendance: s.attendance,
      hireDate: s.hireDate,
      status: s.status,
      userId: s.userId,
    }));

    res.json(formattedStaff);
  });

// Create new staff
export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, username, email, phone, department, role, shift, status, hireDate } = req.body;

  if (!name || !email || !department || !role || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

    let newStaff: any;
    try {
      newStaff = await prisma.$transaction(async (tx) => {
        return await createStaffAccount(tx, {
          name: String(name),
          username: username ? String(username) : undefined,
          email: String(email),
          phone: phone ? String(phone) : undefined,
          department: String(department),
          role: String(role),
          shift: shift ? String(shift) : undefined,
          status: String(status),
          hireDate: hireDate ? new Date(String(hireDate)) : undefined,
        });
      });
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('not configured')) {
        return res.status(error.message.includes('already exists') ? 400 : 500).json({ message: error.message });
      }
      throw error;
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE_STAFF',
        module: 'Staff',
        details: `Created staff member ${newStaff.user.name} (${newStaff.staff.employeeId})`,
      }
    });

    res.status(201).json({ message: 'Staff created successfully', id: newStaff.staff.id, temporaryPassword: newStaff.temporaryPassword });
  });

// Update staff
export const updateStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const staffId = String(req.params.id);
  const { name, username, email, phone, department, role, shift, status } = req.body;
  const normalizedUsername = username ? String(username).trim().toLowerCase() : undefined;

    const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { user: true } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    let roleId = staff.user.roleId;
    if (department && department !== staff.department) {
      let systemRoleName = 'Receptionist';
      const dept = String(department).toLowerCase();
      if (dept === 'housekeeping') systemRoleName = 'Housekeeping';
      else if (dept === 'restaurant') systemRoleName = 'Restaurant';
      else if (dept === 'management') systemRoleName = 'Manager';

      let systemRole = await prisma.role.findUnique({ where: { name: systemRoleName } });
      if (!systemRole) systemRole = await prisma.role.findFirst();
      if (systemRole) roleId = systemRole.id;
    }

    await prisma.$transaction(async (tx: TxClient) => {
      if (name || username || email || phone !== undefined || roleId !== staff.user.roleId) {
        await tx.user.update({
          where: { id: staff.userId },
          data: {
            name: name ? String(name) : undefined,
            username: normalizedUsername,
            email: email ? String(email).trim().toLowerCase() : undefined,
            phone: phone !== undefined ? String(phone) : undefined,
            roleId: roleId !== staff.user.roleId ? roleId : undefined,
          }
        });
      }

      await tx.staff.update({
        where: { id: staffId },
        data: {
          department: department ? String(department) : undefined,
          role: role ? String(role) : undefined,
          shift: shift ? String(shift) : undefined,
          status: status ? String(status) : undefined,
        }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_STAFF',
        module: 'Staff',
        details: `Updated staff member ${staff.user.name}`,
      }
    });

    res.json({ message: 'Staff updated successfully' });
  });

// Delete staff
export const deleteStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const staffId = String(req.params.id);

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    await prisma.$transaction(async (tx: TxClient) => {
      // Disconnect all tasks to prevent cascade deleting historical data
      await tx.housekeepingTask.updateMany({
        where: { staffId: staffId },
        data: { staffId: null }
      });

      await tx.staff.delete({ where: { id: staffId } });
      await tx.user.delete({ where: { id: staff.userId } });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_STAFF',
        module: 'Staff',
        details: `Deleted staff member ${staff.employeeId}`,
      }
    });

    res.json({ message: 'Staff deleted successfully' });
  });

// Assign Shift
export const assignShift = asyncHandler(async (req: Request, res: Response) => {
  const staffId = String(req.params.id);
  const { shift } = req.body;

  if (!shift) {
    return res.status(400).json({ message: 'Shift is required' });
  }

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: { shift: String(shift) }
    });

    res.json({ message: 'Shift assigned successfully' });
  });
