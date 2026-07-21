import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const rooms = await prisma.room.count();
  const guests = await prisma.guest.count();
  const bookings = await prisma.booking.count();
  const menuItems = await prisma.menuItem.count();
  
  console.log(`Rooms: ${rooms}`);
  console.log(`Guests: ${guests}`);
  console.log(`Bookings: ${bookings}`);
  console.log(`MenuItems: ${menuItems}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
