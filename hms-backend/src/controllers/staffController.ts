import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

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
    }));

    res.json(formattedStaff);
  });

// Create new staff
export const createStaff = asyncHandler(async (req: Request, res: Response) => {
  const { name, username, email, phone, department, role, shift, status, hireDate } = req.body;

  if (!name || !email || !department || !role || !status) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

    const finalUsername = username ? String(username) : String(email).split('@')[0];

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: String(email) }, { username: finalUsername }] }
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    let systemRoleName = 'Receptionist';
    const dept = String(department).toLowerCase();
    if (dept === 'housekeeping') systemRoleName = 'Housekeeping';
    else if (dept === 'restaurant') systemRoleName = 'Restaurant';
    else if (dept === 'management') systemRoleName = 'Manager';

    let systemRole = await prisma.role.findUnique({ where: { name: systemRoleName } });
    if (!systemRole) systemRole = await prisma.role.findFirst();

    if (!systemRole) {
      return res.status(500).json({ message: 'System roles not configured properly' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Password123!', salt);

    const newStaff = await prisma.$transaction(async (tx: TxClient) => {
      const count = await tx.staff.count();
      const employeeId = `EMP-${1001 + count}`;

      const user = await tx.user.create({
        data: {
          username: finalUsername,
          email: String(email),
          name: String(name),
          phone: phone ? String(phone) : null,
          passwordHash,
          roleId: systemRole!.id,
        }
      });

      const created = await tx.staff.create({
        data: {
          userId: user.id,
          employeeId,
          department: String(department),
          role: String(role),
          shift: shift ? String(shift) : 'Morning (8AM - 4PM)',
          attendance: 100,
          status: String(status),
          hireDate: hireDate ? new Date(String(hireDate)) : new Date(),
        }
      });

      return { user, staff: created };
    });

    res.status(201).json({ message: 'Staff created successfully', id: newStaff.staff.id });
  });

// Update staff
export const updateStaff = asyncHandler(async (req: Request, res: Response) => {
  const staffId = String(req.params.id);
  const { name, username, email, phone, department, role, shift, status } = req.body;

    const staff = await prisma.staff.findUnique({ where: { id: staffId }, include: { user: true } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    await prisma.$transaction(async (tx: TxClient) => {
      if (name || username || email || phone !== undefined) {
        await tx.user.update({
          where: { id: staff.userId },
          data: {
            name: name ? String(name) : undefined,
            username: username ? String(username) : undefined,
            email: email ? String(email) : undefined,
            phone: phone !== undefined ? String(phone) : undefined,
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

    res.json({ message: 'Staff updated successfully' });
  });

// Delete staff
export const deleteStaff = asyncHandler(async (req: Request, res: Response) => {
  const staffId = String(req.params.id);

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    await prisma.$transaction(async (tx: TxClient) => {
      await tx.staff.delete({ where: { id: staffId } });
      await tx.user.delete({ where: { id: staff.userId } });
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
