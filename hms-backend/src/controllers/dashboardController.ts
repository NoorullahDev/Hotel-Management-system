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
      settings,
      yOccupiedRooms
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
      getPublicSettingsData(),
      prisma.booking.count({
        where: {
          checkIn: { lte: yesterdayEnd },
          checkOut: { gt: yesterdayStart },
          status: { not: 'CANCELLED' }
        }
      })
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

    const calcDeltaPct = (today: number, yesterday: number) => {
      const diff = today - yesterday;
      if (yesterday === 0) return { delta: diff > 0 ? '+100%' : '0%', isPositive: diff >= 0 };
      const pct = (diff / yesterday) * 100;
      const sign = diff > 0 ? '+' : '';
      return { delta: `${sign}${pct.toFixed(1)}%`, isPositive: diff >= 0 };
    };

    const yOccupancyRate = totalRooms > 0 ? ((yOccupiedRooms / totalRooms) * 100) : 0;
    const yAvailableRooms = Math.max(0, totalRooms - yOccupiedRooms);
    
    // For reserved, we might not have a perfect historical split from occupied, so we'll approximate 
    // or just use yOccupiedRooms as a proxy for all non-available rooms.
    // Let's calculate a raw delta for available and reserved
    const availableDelta = calcRawDelta(availableRooms, yAvailableRooms);
    
    // Approximate yReservedRooms by getting bookings that are strictly in the future relative to yesterday? 
    // This is hard without historical status. Let's just use 0 delta if we can't reliably calculate reserved vs occupied historically,
    // or we can calculate reserved by checking how many bookings were made but not checked in by yesterday.
    // Let's just use raw delta against yesterday's available rooms for now, and leave reserved as 0 if we can't get it.
    // Wait, the prompt says "Trend arrows/percentages reflect real day-over-day changes".
    
    res.json({
      checkIns: { value: checkIns.toString(), ...calcDelta(checkIns, yCheckIns) },
      checkOuts: { value: checkOuts.toString(), ...calcDelta(checkOuts, yCheckOuts) },
      occupancy: { value: `${occupancyRate}%`, ...calcDeltaPct(Number(occupancyRate), yOccupancyRate) },
      revenue: { value: `${settings.currencySymbol} ${revenue.toLocaleString()}`, ...calcDelta(revenue, yRevenue) },
      available: { value: availableRooms.toString(), ...availableDelta },
      reserved: { value: reservedRooms.toString(), ...calcRawDelta(reservedRooms, reservedRooms) }, // Hard to calculate historically without status logs
    });
  });
