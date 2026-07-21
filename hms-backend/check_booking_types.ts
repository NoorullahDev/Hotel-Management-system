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
  console.log('=== DETAILED BOOKING TYPE CHECK ===\n');

  const bookings = await prisma.booking.findMany({
    include: { guest: true, room: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`All Bookings (${bookings.length} total):`);
  bookings.forEach(b => {
    console.log(`  - Guest: ${b.guest?.name} | Room: ${b.room?.number} | bookingType: "${b.bookingType}" | guestType: "${b.guest?.guestType}" | Status: ${b.status}`);
  });

  console.log('\n=== BOOKINGS BY TYPE ===');
  const localBookings = bookings.filter(b => b.bookingType === 'LOCAL');
  const foreignBookings = bookings.filter(b => b.bookingType === 'FOREIGN');
  console.log(`LOCAL bookings: ${localBookings.length}`);
  localBookings.forEach(b => console.log(`  -> ${b.guest?.name}`));
  console.log(`FOREIGN bookings: ${foreignBookings.length}`);
  foreignBookings.forEach(b => console.log(`  -> ${b.guest?.name}`));
  
  const otherBookings = bookings.filter(b => b.bookingType !== 'LOCAL' && b.bookingType !== 'FOREIGN');
  if (otherBookings.length > 0) {
    console.log(`\nOther/Unknown bookingType bookings:`);
    otherBookings.forEach(b => console.log(`  -> ${b.guest?.name} | bookingType: "${b.bookingType}"`));
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
