import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getRoles = asyncHandler(async (req: Request, res: Response) => {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(roles);
  });

export const createRole = asyncHandler(async (req: Request, res: Response) => {
    const { name, permissions } = req.body;
    if (!name) return res.status(400).json({ message: 'Role name is required' });

    const role = await prisma.role.create({
      data: {
        name,
        permissions: permissions || []
      }
    });
    res.status(201).json(role);
  });

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, permissions } = req.body;

    const data: any = {};
    if (name) data.name = name;
    if (permissions) data.permissions = permissions;

    const role = await prisma.role.update({
      where: { id },
      data
    });
    res.json(role);
  });

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    
    // Check if role is used by users
    const usersCount = await prisma.user.count({
      where: { roleId: id }
    });

    if (usersCount > 0) {
      return res.status(400).json({ message: 'Cannot delete role assigned to users. Reassign users first.' });
    }

    await prisma.role.delete({
      where: { id }
    });
    res.json({ message: 'Role deleted successfully' });
  });
