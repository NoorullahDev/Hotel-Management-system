import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const settings = await prisma.hotelSettings.findFirst();
  const taxRate = settings?.taxRate;
  console.log('taxRate:', taxRate);
  console.log('typeof taxRate:', typeof taxRate);
  console.log('constructor name:', taxRate?.constructor?.name);
  console.log('isDecimal:', (taxRate as any)?.isDecimal);
  console.log('properties:', Object.keys(taxRate || {}));
  pool.end();
}
run();
