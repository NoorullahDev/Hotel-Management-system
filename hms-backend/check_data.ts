import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db.bak'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const bookings = await prisma.booking.findMany();
  console.log('Total bookings in dev.db.bak:', bookings.length);
  const guests = await prisma.guest.findMany();
  console.log('Total guests in dev.db.bak:', guests.length);
  const foreignGuests = await prisma.guest.findMany({ where: { guestType: 'FOREIGN' } });
  console.log('Foreign guests in dev.db.bak:', foreignGuests.length);
}
main().finally(() => prisma.$disconnect());
