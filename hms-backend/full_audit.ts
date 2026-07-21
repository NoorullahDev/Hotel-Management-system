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
  console.log('=== FULL DATABASE AUDIT ===\n');

  // All guests ever - no filter
  const allGuests = await prisma.guest.findMany({ orderBy: { name: 'asc' } });
  console.log(`ALL Guests in database (${allGuests.length}):`);
  allGuests.forEach(g => {
    console.log(`  ID: ${g.id}`);
    console.log(`  Name: "${g.name}" | Email: "${g.email || 'none'}" | Phone: "${g.phone || 'none'}" | Type: ${g.guestType}`);
    console.log();
  });

  // All bookings ever
  const allBookings = await prisma.booking.findMany({
    include: { guest: true, room: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log(`\nALL Bookings in database (${allBookings.length}):`);
  allBookings.forEach(b => {
    console.log(`  ID: ${b.id}`);
    console.log(`  Guest: "${b.guest?.name || 'MISSING'}" | Room: ${b.room?.number} | Type: ${b.bookingType} | Status: ${b.status}`);
    console.log(`  CheckIn: ${b.checkIn.toISOString()} | CheckOut: ${b.checkOut.toISOString()}`);
    console.log(`  CreatedAt: ${b.createdAt.toISOString()}`);
    console.log();
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
