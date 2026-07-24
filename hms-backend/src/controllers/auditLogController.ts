import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const { userId, module, action, dateFrom, dateTo, page = '1', limit = '10' } = req.query;
    
    const filter: any = {};
    if (userId) filter.userId = String(userId);
    if (module) filter.module = String(module);
    if (action) filter.action = String(action);
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) filter.createdAt.lte = new Date(String(dateTo));
    }

    const pageNum = parseInt(String(page), 10);
    const limitNum = parseInt(String(limit), 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where: filter }),
      prisma.auditLog.findMany({
        where: filter,
        include: {
          user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    res.json({
      data: logs,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  });
