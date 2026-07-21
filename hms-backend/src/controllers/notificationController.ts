import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';
import { getPagination, buildMeta } from '../utils/pagination';

export const getNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const { type, isRead, page, limit } = req.query;

    const { skip, take, page: pageNumber } = getPagination(page, limit, 50);

    const where: any = { userId };
    
    if (type && type !== 'All Types') {
      where.type = type as string;
    }
    
    if (isRead !== undefined) {
      where.isRead = isRead === 'true';
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.notification.count({ where })
    ]);

    // Optimize stats to avoid full table scan
    const [typeGroups, unreadCount] = await Promise.all([
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: { _all: true }
      }),
      prisma.notification.count({ where: { userId, isRead: false } })
    ]);

    const byType = Object.fromEntries(typeGroups.map(g => [g.type, g._count._all]));

    const stats = {
      total:             typeGroups.reduce((s, g) => s + g._count._all, 0),
      unread:            unreadCount,
      bookingAlerts:     byType['Booking']     ?? 0,
      paymentAlerts:     byType['Payment']     ?? 0,
      maintenanceAlerts: (byType['Maintenance'] ?? 0) + (byType['Room Ready'] ?? 0),
      systemAlerts:      byType['System']      ?? 0,
    };

    res.json({
      data: notifications,
      meta: buildMeta(total, pageNumber, take),
      stats
    });
  });

export const markRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const notificationId = req.params.id as string;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true }
    });

    res.json({ success: true });
  });

export const markAllRead = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({ success: true });
  });

export const getPreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId }
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId }
      });
    }

    res.json(prefs);
  });

export const updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const data = req.body;
    
    // Whitelist updates
    const updates: any = {};
    const keys = ['booking', 'checkIn', 'checkOut', 'roomReady', 'foodOrder', 'feedback', 'system', 'payment', 'maintenance', 'staff', 'emergency', 'email', 'sms', 'desktop'];
    keys.forEach(k => {
      if (typeof data[k] === 'boolean') updates[k] = data[k];
    });

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...updates },
      update: updates
    });

    res.json(prefs);
  });

export const deleteNotification = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const notificationId = req.params.id as string;

    await prisma.notification.deleteMany({
      where: { id: notificationId, userId }
    });

    res.json({ success: true });
  });
