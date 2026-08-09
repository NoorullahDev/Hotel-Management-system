import { asyncHandler } from '../utils/asyncHandler';
import { Request, Response } from 'express';
import prisma from '../prisma';

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Parse date range from query params, defaulting to last 7 days. */
function getDateRange(req: Request): { start: Date; end: Date } {
  // Append T00:00:00 so JS parses it in the server's local time instead of UTC midnight
  const end   = req.query.endDate   ? new Date((req.query.endDate as string) + 'T00:00:00') : new Date();
  const start = req.query.startDate ? new Date((req.query.startDate as string) + 'T00:00:00') : new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  
  if (start.getTime() > end.getTime()) {
    const error = new Error('Start date cannot be after end date') as any;
    error.statusCode = 400;
    throw error;
  }
  
  return { start, end };
}

/** Format a Date as "Jun 15" style label. */
function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Generate an array of every Date between start and end (inclusive). */
function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Truncate a Date to its ISO date string key (YYYY-MM-DD). */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);
    const diffMs    = end.getTime() - start.getTime();
    const prevEnd   = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - diffMs);

    const [revCur, revPrev, totalRooms, occupiedRooms, reservedRooms, bookCur, bookPrev, feedCur, feedPrev] =
      await Promise.all([
        prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: start, lte: end } } }),
        prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
        prisma.room.count(),
        prisma.room.count({ where: { status: 'OCCUPIED' } }),
        prisma.room.count({ where: { status: 'RESERVED' } }),
        prisma.booking.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.booking.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
        prisma.feedback.aggregate({ _avg: { rating: true }, where: { booking: { createdAt: { gte: start, lte: end } } } }),
        prisma.feedback.aggregate({ _avg: { rating: true }, where: { booking: { createdAt: { gte: prevStart, lte: prevEnd } } } }),
      ]);

    const totalRevenue   = revCur._sum.amount?.toNumber()  ?? 0;
    const prevRevenue    = revPrev._sum.amount?.toNumber()  ?? 0;
    const revDelta       = prevRevenue > 0 ? (((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : (totalRevenue > 0 ? 'New' : '—');
    const occupancyRate  = totalRooms  > 0 ? (((occupiedRooms + reservedRooms) / totalRooms) * 100).toFixed(1) : '0.0';
    const bookDelta      = bookPrev    > 0 ? (((bookCur - bookPrev) / bookPrev) * 100).toFixed(1) : (bookCur > 0 ? 'New' : '—');

    // Average length of stay — fetch once with select (minimal columns)
    const stayBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
      select: { checkIn: true, checkOut: true },
    });
    const avgLOS = stayBookings.length > 0
      ? (stayBookings.reduce((sum, b) => {
          const nights = Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(nights, 1);
        }, 0) / stayBookings.length).toFixed(1)
      : '0.0';

    const prevStayBookings = await prisma.booking.findMany({
      where: { createdAt: { gte: prevStart, lte: prevEnd }, status: { not: 'CANCELLED' } },
      select: { checkIn: true, checkOut: true },
    });
    const prevAvgLOS = prevStayBookings.length > 0
      ? (prevStayBookings.reduce((sum, b) => {
          const nights = Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / (1000 * 60 * 60 * 24));
          return sum + Math.max(nights, 1);
        }, 0) / prevStayBookings.length)
      : 0;

    const losDelta = prevAvgLOS > 0
      ? (((parseFloat(avgLOS) - prevAvgLOS) / prevAvgLOS) * 100).toFixed(1)
      : (parseFloat(avgLOS) > 0 ? 'New' : '—');

    const satisfaction     = feedCur._avg.rating ? feedCur._avg.rating.toFixed(1) : '0.0';
    const prevSatisfaction = feedPrev._avg.rating ?? 0;
    const satDelta         = prevSatisfaction > 0
      ? ((parseFloat(satisfaction) - prevSatisfaction) / prevSatisfaction * 100).toFixed(1)
      : (parseFloat(satisfaction) > 0 ? 'New' : '—');

    res.json({
      totalRevenue,
      revenueDelta:       revDelta === 'New' || revDelta === '—' ? revDelta : parseFloat(revDelta),
      occupancyRate:      parseFloat(occupancyRate),
      occupancyDelta:     null, // Requires historical snapshot data not currently tracked
      totalBookings:      bookCur,
      bookingsDelta:      bookDelta === 'New' || bookDelta === '—' ? bookDelta : parseFloat(bookDelta),
      avgLOS:             parseFloat(avgLOS),
      losDelta:           losDelta === 'New' || losDelta === '—' ? losDelta : parseFloat(losDelta),
      guestSatisfaction:  parseFloat(satisfaction),
      satisfactionDelta:  satDelta === 'New' || satDelta === '—' ? satDelta : parseFloat(satDelta),
    });
  });

// ─── GET /api/reports/revenue ─────────────────────────────────────────────────

/**
 * BEFORE: 2 aggregate queries per day — O(days * 2) round-trips.
 * AFTER:  2 range queries total + in-memory groupBy — O(2) round-trips.
 */
export const getRevenueTrend = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const [payments, foodOrders] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { amount: true, createdAt: true },
      }),
      prisma.foodOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    // Group by calendar day in memory
    const revenueByDay = new Map<string, number>();
    const foodByDay    = new Map<string, number>();

    for (const p of payments) {
      const k = dayKey(p.createdAt);
      revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + p.amount.toNumber());
    }
    for (const f of foodOrders) {
      const k = dayKey(f.createdAt);
      foodByDay.set(k, (foodByDay.get(k) ?? 0) + f.totalAmount.toNumber());
    }

    const data = eachDay(start, end).map(day => {
      const k    = dayKey(day);
      const total = revenueByDay.get(k) ?? 0;
      let food  = foodByDay.get(k)    ?? 0;
      
      if (food > total) food = total;
      
      return {
        name:              formatDateLabel(day),
        revenue:           total,
        roomRevenue:       total - food,
        restaurantRevenue: food,
      };
    });

    res.json(data);
  });

// ─── GET /api/reports/occupancy ───────────────────────────────────────────────

export const getOccupancyRate = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);
    const days = eachDay(start, end);

    // Current room status snapshot (4 → 1 groupBy query)
    const [totalRooms, statusGroups] = await Promise.all([
      prisma.room.count(),
      prisma.room.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const statusMap = Object.fromEntries(
      statusGroups.map(g => [g.status, g._count._all])
    );
    const occupied    = statusMap['OCCUPIED']    ?? 0;
    const available   = statusMap['AVAILABLE']   ?? 0;
    const reserved    = statusMap['RESERVED']    ?? 0;
    const maintenance = statusMap['MAINTENANCE'] ?? 0;
    const total       = totalRooms || 1;

    const donut = [
      { name: 'Occupied',    value: occupied,    percentage: ((occupied    / total) * 100).toFixed(1), color: '#6366f1' },
      { name: 'Available',   value: available,   percentage: ((available   / total) * 100).toFixed(1), color: '#22c55e' },
      { name: 'Reserved',    value: reserved,    percentage: ((reserved    / total) * 100).toFixed(1), color: '#a855f7' },
      { name: 'Out of Order',value: maintenance, percentage: ((maintenance / total) * 100).toFixed(1), color: '#64748b' },
    ];

    // Daily occupancy table — 2 booking counts per day (CHECKED_IN + CONFIRMED)
    const allBookings = await prisma.booking.findMany({
      where: {
        status: { in: ['CHECKED_IN', 'CONFIRMED'] },
        checkIn: { lte: end },
        checkOut: { gte: start }
      },
      select: { checkIn: true, checkOut: true, status: true }
    });

    const dailyData = days.map((day) => {
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      let checkedIn = 0;
      let res2 = 0;

      for (const b of allBookings) {
        if (b.checkIn <= dayEnd && b.checkOut >= day) {
          if (b.status === 'CHECKED_IN') checkedIn++;
          if (b.status === 'CONFIRMED') res2++;
        }
      }

      return {
        date:         formatDateLabel(day),
        occupied:     checkedIn,
        available:    Math.max(0, totalRooms - checkedIn - res2),
        reserved:     res2,
        occupancyPct: totalRooms > 0 ? (((checkedIn + res2) / totalRooms) * 100).toFixed(1) : '0.0',
      };
    });

    res.json({ donut, table: dailyData, occupancyRate: total > 0 ? (((occupied + reserved) / total) * 100).toFixed(1) : '0.0' });
  });

// ─── GET /api/reports/bookings-overview ──────────────────────────────────────

/**
 * BEFORE: 1 count query per day — O(days) round-trips.
 * AFTER:  1 range query + in-memory groupBy — O(1) round-trips.
 */
export const getBookingsOverview = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const bookings = await prisma.booking.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { createdAt: true },
    });

    const countByDay = new Map<string, number>();
    for (const b of bookings) {
      const k = dayKey(b.createdAt);
      countByDay.set(k, (countByDay.get(k) ?? 0) + 1);
    }

    const data = eachDay(start, end).map(day => ({
      name:     formatDateLabel(day),
      bookings: countByDay.get(dayKey(day)) ?? 0,
    }));

    res.json(data);
  });

// ─── GET /api/reports/restaurant-revenue ─────────────────────────────────────

/**
 * BEFORE: 3 queries per day (aggregate + 2× findMany) — O(days * 3) round-trips.
 * AFTER:  1 range findMany + in-memory groupBy — O(1) round-trips.
 */
export const getRestaurantRevenue = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    // Single join-style query — fetch orders + items together
    const orders = await prisma.foodOrder.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: {
        createdAt:   true,
        totalAmount: true,
        items: { select: { itemName: true, quantity: true, price: true } },
      },
    });

    // Build per-day aggregates in memory
    type DayBucket = {
      revenue: number; orders: number;
      foodSales: number; beverageSales: number;
      itemCounts: Record<string, number>;
    };

    const dayBuckets = new Map<string, DayBucket>();

    const BEVERAGE_KEYWORDS = ['drink', 'water', 'cola', 'juice', 'tea', 'coffee'];

    for (const order of orders) {
      const k = dayKey(order.createdAt);
      if (!dayBuckets.has(k)) {
        dayBuckets.set(k, { revenue: 0, orders: 0, foodSales: 0, beverageSales: 0, itemCounts: {} });
      }
      const bucket = dayBuckets.get(k)!;
      bucket.revenue += order.totalAmount.toNumber();
      bucket.orders  += 1;

      for (const item of order.items) {
        const amt  = item.price.toNumber() * item.quantity;
        const name = item.itemName.toLowerCase();
        bucket.itemCounts[item.itemName] = (bucket.itemCounts[item.itemName] ?? 0) + item.quantity;

        if (BEVERAGE_KEYWORDS.some(kw => name.includes(kw))) {
          bucket.beverageSales += amt;
        } else {
          bucket.foodSales += amt;
        }
      }
    }

    const data = eachDay(start, end).map(day => {
      const k      = dayKey(day);
      const bucket = dayBuckets.get(k);
      const total   = bucket?.revenue ?? 0;
      const numOrds = bucket?.orders  ?? 0;
      const topItem = bucket
        ? (Object.entries(bucket.itemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—')
        : '—';

      return {
        name:            formatDateLabel(day),
        revenue:         total,
        orders:          numOrds,
        avgOrder:        numOrds > 0 ? parseFloat((total / numOrds).toFixed(2)) : 0,
        foodSales:       parseFloat((bucket?.foodSales    ?? 0).toFixed(2)),
        beverageSales:   parseFloat((bucket?.beverageSales ?? 0).toFixed(2)),
        topItem,
      };
    });

    res.json(data);
  });

// ─── GET /api/reports/staff-performance ──────────────────────────────────────

export const getStaffPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const staffMembers = await prisma.staff.findMany({
      where: { status: 'Active' },
      include: {
        user: { select: { name: true } },
        housekeepingTasks: {
          where: { status: 'COMPLETED', completedAt: { gte: start, lte: end } },
        },
      },
      take: 10,
    });

    const data = staffMembers
      .map(s => ({
        name:           s.user.name,
        department:     s.department,
        tasksCompleted: s.housekeepingTasks.length,
        efficiency:     s.attendance ? parseFloat(s.attendance.toFixed(0)) : 90,
        rating:         parseFloat(((s.attendance ?? 90) / 20).toFixed(1)),
      }))
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
      .slice(0, 5);

    res.json(data);
  });

// ─── GET /api/reports/revenue-by-department ──────────────────────────────────

export const getRevenueByDepartment = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const [payments, foodOrders] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { amount: true, createdAt: true },
      }),
      prisma.foodOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    const revenueByDay = new Map<string, number>();
    const foodByDay    = new Map<string, number>();

    for (const p of payments) {
      const k = dayKey(p.createdAt);
      revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + p.amount.toNumber());
    }
    for (const f of foodOrders) {
      const k = dayKey(f.createdAt);
      foodByDay.set(k, (foodByDay.get(k) ?? 0) + f.totalAmount.toNumber());
    }

    let grandTotal = 0;
    let restaurantRevenue = 0;

    for (const day of eachDay(start, end)) {
      const k = dayKey(day);
      const dayTotal = revenueByDay.get(k) ?? 0;
      let dayFood = foodByDay.get(k) ?? 0;
      if (dayFood > dayTotal) dayFood = dayTotal;
      grandTotal += dayTotal;
      restaurantRevenue += dayFood;
    }
    const roomsRevenue = grandTotal - restaurantRevenue;

    const data = [
      { name: 'Rooms',      value: roomsRevenue,      percentage: grandTotal > 0 ? ((roomsRevenue      / grandTotal) * 100).toFixed(1) : '0.0', color: '#6366f1' },
      { name: 'Restaurant', value: restaurantRevenue, percentage: grandTotal > 0 ? ((restaurantRevenue / grandTotal) * 100).toFixed(1) : '0.0', color: '#22c55e' },
    ];

    res.json({ data, total: grandTotal });
  });

// ─── GET /api/reports/guest-satisfaction ─────────────────────────────────────

export const getGuestSatisfaction = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);
    const data  = [];

    const diff = end.getTime() - start.getTime();
    const segment = diff / 4;

    for (let i = 0; i < 4; i++) {
      const segStart = new Date(start.getTime() + i * segment);
      const segEnd = new Date(start.getTime() + (i + 1) * segment - 1);

      const result = await prisma.feedback.aggregate({
        _avg: { rating: true },
        where: { booking: { createdAt: { gte: segStart, lte: segEnd } } },
      });

      const label = `${formatDateLabel(segStart)} - ${formatDateLabel(segEnd)}`;
      data.push({ name: label, rating: result._avg.rating ? parseFloat(result._avg.rating.toFixed(1)) : 0.0 });
    }

    res.json(data);
  });

// ─── GET /api/reports/revenue-report-table ───────────────────────────────────

/**
 * BEFORE: 2 aggregate queries per day — O(days * 2) round-trips.
 * AFTER:  2 range queries + in-memory groupBy — O(2) round-trips.
 */
export const getRevenueReportTable = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const [payments, food] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { amount: true, createdAt: true },
      }),
      prisma.foodOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    const revenueByDay = new Map<string, number>();
    const foodByDay    = new Map<string, number>();

    for (const p of payments) {
      const k = dayKey(p.createdAt);
      revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + p.amount.toNumber());
    }
    for (const f of food) {
      const k = dayKey(f.createdAt);
      foodByDay.set(k, (foodByDay.get(k) ?? 0) + f.totalAmount.toNumber());
    }

    let totalRooms = 0, totalRestaurant = 0;

    const rows = eachDay(start, end).map(day => {
      const k        = dayKey(day);
      const total    = revenueByDay.get(k) ?? 0;
      let restRev  = foodByDay.get(k)    ?? 0;
      if (restRev > total) restRev = total;
      const roomRev  = total - restRev;

      totalRooms      += roomRev;
      totalRestaurant += restRev;

      return {
        date:              formatDateLabel(day),
        roomsRevenue:      parseFloat(roomRev.toFixed(2)),
        restaurantRevenue: parseFloat(restRev.toFixed(2)),
        otherRevenue:      0,
        total:             parseFloat(total.toFixed(2)),
      };
    });

    res.json({
      rows,
      totals: {
        roomsRevenue:      parseFloat(totalRooms.toFixed(2)),
        restaurantRevenue: parseFloat(totalRestaurant.toFixed(2)),
        otherRevenue:      0,
        total:             parseFloat((totalRooms + totalRestaurant).toFixed(2)),
      },
    });
  });

// ─── GET /api/reports/export ──────────────────────────────────────────────────

/**
 * BEFORE: 2 aggregate queries per day — O(days * 2) round-trips.
 * AFTER:  2 range queries + in-memory groupBy — O(2) round-trips.
 */
export const exportReport = asyncHandler(async (req: Request, res: Response) => {
    const { start, end } = getDateRange(req);

    const [payments, food] = await Promise.all([
      prisma.payment.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { amount: true, createdAt: true },
      }),
      prisma.foodOrder.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { totalAmount: true, createdAt: true },
      }),
    ]);

    const revenueByDay = new Map<string, number>();
    const foodByDay    = new Map<string, number>();

    for (const p of payments) {
      const k = dayKey(p.createdAt);
      revenueByDay.set(k, (revenueByDay.get(k) ?? 0) + p.amount.toNumber());
    }
    for (const f of food) {
      const k = dayKey(f.createdAt);
      foodByDay.set(k, (foodByDay.get(k) ?? 0) + f.totalAmount.toNumber());
    }

    const headers = ['Date', 'Rooms Revenue', 'Restaurant Revenue', 'Other Revenue', 'Total'];
    const csvRows: string[][] = [];

    let sumRooms = 0, sumRest = 0, sumTotal = 0;

    for (const day of eachDay(start, end)) {
      const k       = dayKey(day);
      const total   = revenueByDay.get(k) ?? 0;
      let restRev = foodByDay.get(k)    ?? 0;
      if (restRev > total) restRev = total;
      const roomRev = total - restRev;

      sumRooms += roomRev;
      sumRest  += restRev;
      sumTotal += total;

      csvRows.push([
        formatDateLabel(day),
        roomRev.toFixed(2),
        restRev.toFixed(2),
        '0.00',
        total.toFixed(2),
      ]);
    }

    csvRows.push([
      'Total',
      sumRooms.toFixed(2),
      sumRest.toFixed(2),
      '0.00',
      sumTotal.toFixed(2),
    ]);

    const csv = [headers, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue_report_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  });
