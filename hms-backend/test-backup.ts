import 'dotenv/config';
import { generateSqlDump } from './src/utils/sqlDump';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const [
    roles, users, guests, roomTypes, rooms, bookings, payments,
    invoices, invoiceItems, foodOrders, orderItems, menuCategories,
    menuItems, housekeepingTasks, roomMaintenances, feedbacks,
    notifications, notificationPreferences, auditLogs,
    hotelSettings, settings, staff
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, name: true, phone: true, profilePhoto: true, roleId: true, oauthProvider: true, failedLoginAttempts: true, lockedUntil: true, passwordHash: true } }),
    prisma.guest.findMany(),
    prisma.roomType.findMany(),
    prisma.room.findMany(),
    prisma.booking.findMany(),
    prisma.payment.findMany(),
    prisma.invoice.findMany(),
    prisma.invoiceItem.findMany(),
    prisma.foodOrder.findMany(),
    prisma.orderItem.findMany(),
    prisma.menuCategory.findMany(),
    prisma.menuItem.findMany(),
    prisma.housekeepingTask.findMany(),
    prisma.roomMaintenance.findMany(),
    prisma.feedback.findMany(),
    prisma.notification.findMany(),
    prisma.notificationPreference.findMany(),
    prisma.auditLog.findMany(),
    prisma.hotelSettings.findMany(),
    prisma.setting.findMany(),
    prisma.staff.findMany(),
  ]);

  const backupData = {
    roles, users, guests, roomTypes, rooms, bookings, payments,
    invoices, invoiceItems, foodOrders, orderItems, menuCategories,
    menuItems, housekeepingTasks, roomMaintenances, feedbacks,
    notifications, notificationPreferences, auditLogs,
    hotelSettings, settings, staff
  };

  const sqlScript = generateSqlDump(backupData);
  fs.writeFileSync('test-backup.sql', sqlScript);
  console.log('Saved to test-backup.sql');

  // Try running it
  const pgClient = await pool.connect();
  try {
    await pgClient.query('BEGIN');
    await pgClient.query(sqlScript);
    await pgClient.query('ROLLBACK');
    console.log('Successfully ran the SQL!');
  } catch (e: any) {
    console.error('Failed to run SQL:', e.message);
  } finally {
    pgClient.release();
    pool.end();
  }
}

run();
