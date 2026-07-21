import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import { getIO } from '../socket';

// ─── Preference key mapping ───────────────────────────────────────────────────

const PREF_KEY_MAP: Record<string, string> = {
  'Booking':        'booking',
  'Check-in':       'checkIn',
  'Check-out':      'checkOut',
  'Room Ready':     'roomReady',
  'Housekeeping':   'roomReady',
  'Food Order':     'foodOrder',
  'Feedback':       'feedback',
  'System':         'system',
  'Maintenance':    'maintenance',
  'Payment':        'payment',
  'Staff Activity': 'staff',
  'Emergency':      'emergency',
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotifyRolesOptions {
  roles: string[];
  type: string;
  title: string;
  message: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create in-app notifications for all users with the given roles,
 * respecting each user's per-type preference settings.
 *
 * Uses a single batch INSERT (createManyAndReturn) instead of one
 * INSERT per user, then fans out socket events in memory.
 *
 * This function is intentionally non-throwing: notification failures
 * must never surface as errors on the primary booking/checkout path.
 */
export const notifyRoles = async (
  roles: string[],
  type: string,
  title: string,
  message: string,
  referenceId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> => {
  try {
    const prefKey = PREF_KEY_MAP[type] ?? 'system';

    // 1. Fetch only id + preference — no full user row needed
    const users = await prisma.user.findMany({
      where: { role: { name: { in: roles } } },
      select: { id: true, notificationPreference: true },
    });

    // 2. Filter by each user's preference (default: enabled when prefs missing)
    const eligible = users.filter(u => {
      const prefs = u.notificationPreference as Record<string, boolean> | null;
      if (!prefs) return true;                  // no prefs record → notify
      if (prefs[prefKey] === undefined) return true; // unknown key → notify
      return prefs[prefKey] === true;
    });

    if (eligible.length === 0) return;

    const payload: Prisma.NotificationCreateManyInput[] = eligible.map(u => ({
      userId:      u.id,
      type,
      title,
      message,
      referenceId: referenceId ?? undefined,
      // Prisma Json nullable field: pass undefined (omit) rather than null when no metadata
      metadata:    metadata !== undefined && metadata !== null
        ? (metadata as Prisma.InputJsonValue)
        : Prisma.DbNull,
    }));

    // 3. Single batch insert — replaces N sequential prisma.notification.create() calls
    const created = await (prisma.notification as any).createManyAndReturn
      ? await (prisma.notification as any).createManyAndReturn({ data: payload })
      : await Promise.all(payload.map(d => prisma.notification.create({ data: d })));

    // 4. Fan-out socket events in memory (no extra DB queries)
    const io = getIO();
    for (const notification of created) {
      io.to(`user:${notification.userId}`).emit('notification:new', notification);
    }
  } catch (err) {
    // Notifications are non-critical: log but never propagate to caller
    console.error('[notifyRoles] Failed to dispatch notifications:', err);
  }
};
