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
  console.log('=== DATABASE STATE CHECK ===\n');

  const guests = await prisma.guest.findMany({ orderBy: { name: 'asc' } });
  console.log(`Guests (${guests.length} total):`);
  guests.forEach(g => console.log(`  - [${g.id}] ${g.name} | ${g.email || 'no email'} | ${g.phone || 'no phone'} | Type: ${g.guestType}`));

  const bookings = await prisma.booking.findMany({
    include: { guest: true, room: true },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`\nBookings (${bookings.length} total):`);
  bookings.forEach(b => console.log(`  - [${b.id}] Guest: ${b.guest?.name || 'N/A'} | Room: ${b.room?.number || 'N/A'} | Status: ${b.status} | Total: ${b.total}`));

  const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
  console.log(`\nRooms (${rooms.length} total):`);
  rooms.forEach(r => console.log(`  - Room ${r.number}: ${r.status}`));

  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' } });
  console.log(`\nPayments (${payments.length} total):`);

  const invoices = await prisma.invoice.findMany();
  console.log(`\nInvoices (${invoices.length} total):`);

  const foodOrders = await prisma.foodOrder.findMany({ orderBy: { createdAt: 'desc' } });
  console.log(`\nFood Orders (${foodOrders.length} total):`);

  console.log('\n=== END OF CHECK ===');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
