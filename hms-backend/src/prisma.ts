import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db',
  // better-sqlite3 `timeout` = SQLITE busy_timeout (ms). Must stay well below the
  // interactive-transaction timeout used in booking.service.ts so a transient lock
  // (e.g. a second process/connection touching the DB) waits instead of aborting a
  // transaction mid-flight, which can leave the single connection wedged.
  timeout: 8000
});

const prisma = new PrismaClient({ adapter });

export default prisma;
