import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { getPublicSettingsData } from '../utils/settings';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      checkIns,
      checkOuts,
      roomGroups,
      todayPayments,
      settings
    ] = await Promise.all([
      prisma.booking.count({ where: { checkIn: { gte: todayStart, lte: todayEnd } } }),
      prisma.booking.count({ where: { checkOut: { gte: todayStart, lte: todayEnd } } }),
      prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart, lte: todayEnd } }
      }),
      getPublicSettingsData()
    ]);

    const byStatus = Object.fromEntries(roomGroups.map(g => [g.status, g._count._all]));
    
    const totalRooms = roomGroups.reduce((acc, g) => acc + g._count._all, 0);
    const occupiedRooms = byStatus['OCCUPIED'] || 0;
    const availableRooms = byStatus['AVAILABLE'] || 0;
    const reservedRooms = byStatus['RESERVED'] || 0;

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : "0.0";
    const revenue = todayPayments._sum.amount ? todayPayments._sum.amount.toNumber() : 0;

    // We use mock deltas for v1 as discussed in the plan
    res.json({
      checkIns: { value: checkIns.toString(), delta: '+5%', isPositive: true },
      checkOuts: { value: checkOuts.toString(), delta: '+2%', isPositive: true },
      occupancy: { value: `${occupancyRate}%`, delta: '+1.2%', isPositive: true },
      revenue: { value: `${settings.currencySymbol} ${revenue.toLocaleString()}`, delta: '+8%', isPositive: true },
      available: { value: availableRooms.toString(), delta: '-2', isPositive: false },
      reserved: { value: reservedRooms.toString(), delta: '+1', isPositive: true },
    });
  });
