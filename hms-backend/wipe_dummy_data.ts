import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting data wipe...');

  // Delete all transaction records in correct dependency order
  await prisma.payment.deleteMany({});
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.foodOrder.deleteMany({});
  await prisma.feedback.deleteMany({});
  
  // Bookings and guests
  await prisma.booking.deleteMany({});
  await prisma.guest.deleteMany({});

  console.log('Successfully wiped all transaction dummy data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
