const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

process.env.DATABASE_URL = 'file:./prisma/dev.db';

const db = new Database(path.join(__dirname, 'prisma/dev.db'));
const adapter = new PrismaBetterSqlite3(db);
const prisma = new PrismaClient({ adapter });

async function main() {
  const bookings = await prisma.booking.findMany({
    include: { payments: true }
  });
  
  for (const b of bookings) {
    const paidAmount = b.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    if (paidAmount > 0 && Number(b.total) !== paidAmount) {
      console.log(`Booking ${b.id} has mismatch: Total ${b.total} != Paid ${paidAmount}`);
      const diff = paidAmount - Number(b.total);
      if (diff > 0) {
        const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000));
        const room = await prisma.room.findUnique({ where: { id: b.roomId } });
        const newRoomRate = Number(room.price) + (diff / nights);
        
        await prisma.booking.update({
          where: { id: b.id },
          data: { roomRate: newRoomRate }
        });
        console.log(`Updated booking ${b.id} roomRate to ${newRoomRate} to fix the mismatch!`);
      }
    }
  }
}

main().catch(console.error).finally(() => process.exit(0));
