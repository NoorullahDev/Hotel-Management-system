import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';
import { getPublicSettingsData } from '../utils/settings';

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd);
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const [
      checkIns,
      checkOuts,
      yCheckIns,
      yCheckOuts,
      roomGroups,
      todayPayments,
      yPayments,
      settings
    ] = await Promise.all([
      prisma.booking.count({ where: { checkIn: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } } }),
      prisma.booking.count({ where: { checkOut: { gte: todayStart, lte: todayEnd }, status: { not: 'CANCELLED' } } }),
      prisma.booking.count({ where: { checkIn: { gte: yesterdayStart, lte: yesterdayEnd }, status: { not: 'CANCELLED' } } }),
      prisma.booking.count({ where: { checkOut: { gte: yesterdayStart, lte: yesterdayEnd }, status: { not: 'CANCELLED' } } }),
      prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: todayStart, lte: todayEnd } }
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: yesterdayStart, lte: yesterdayEnd } }
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
    const yRevenue = yPayments._sum.amount ? yPayments._sum.amount.toNumber() : 0;

    const calcDelta = (today: number, yesterday: number, isPercent = false) => {
      const diff = today - yesterday;
      if (yesterday === 0) return { delta: diff > 0 ? '+100%' : '0%', isPositive: diff >= 0 };
      const pct = (diff / yesterday) * 100;
      const sign = diff > 0 ? '+' : '';
      return { delta: `${sign}${pct.toFixed(1)}%`, isPositive: diff >= 0 };
    };

    const calcRawDelta = (today: number, yesterday: number) => {
      const diff = today - yesterday;
      const sign = diff > 0 ? '+' : '';
      return { delta: `${sign}${diff}`, isPositive: diff >= 0 };
    };

    res.json({
      checkIns: { value: checkIns.toString(), ...calcDelta(checkIns, yCheckIns) },
      checkOuts: { value: checkOuts.toString(), ...calcDelta(checkOuts, yCheckOuts) },
      occupancy: { value: `${occupancyRate}%`, delta: '0%', isPositive: true },
      revenue: { value: `${settings.currencySymbol} ${revenue.toLocaleString()}`, ...calcDelta(revenue, yRevenue) },
      available: { value: availableRooms.toString(), delta: '0', isPositive: true },
      reserved: { value: reservedRooms.toString(), delta: '0', isPositive: true },
    });
  });
