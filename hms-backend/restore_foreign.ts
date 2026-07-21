import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const foreignGuests = await prisma.guest.findMany({ where: { guestType: 'FOREIGN' } });
  
  if (foreignGuests.length === 0) {
    const fg1 = await prisma.guest.create({
      data: {
        name: 'Michael Smith',
        email: 'michael.foreign@example.com',
        phone: '+1 555-010-232',
        guestType: 'FOREIGN',
        nationality: 'USA',
        idType: 'PASSPORT',
        idNumber: 'P123456789'
      }
    });

    const fg2 = await prisma.guest.create({
      data: {
        name: 'Emma Johnson',
        email: 'emma.foreign@example.com',
        phone: '+44 7700-900-111',
        guestType: 'FOREIGN',
        nationality: 'UK',
        idType: 'PASSPORT',
        idNumber: 'P987654321'
      }
    });

    const room1 = await prisma.room.findFirst({ where: { status: 'AVAILABLE' } });
    const room2 = await prisma.room.findFirst({ where: { status: 'AVAILABLE', id: { not: room1?.id } } });

    if (room1) {
      await prisma.booking.create({
        data: {
          guestId: fg1.id,
          roomId: room1.id,
          checkIn: new Date(),
          checkOut: new Date(Date.now() + 86400000 * 2),
          guestCount: 2,
          bookingType: 'FOREIGN',
          status: 'CONFIRMED',
          subtotal: 1000,
          tax: 100,
          total: 1100
        }
      });
      await prisma.room.update({ where: { id: room1.id }, data: { status: 'RESERVED' } });
    }

    if (room2) {
      await prisma.booking.create({
        data: {
          guestId: fg2.id,
          roomId: room2.id,
          checkIn: new Date(),
          checkOut: new Date(Date.now() + 86400000 * 4),
          guestCount: 1,
          bookingType: 'FOREIGN',
          status: 'CHECKED_IN',
          subtotal: 1500,
          tax: 150,
          total: 1650
        }
      });
      await prisma.room.update({ where: { id: room2.id }, data: { status: 'OCCUPIED' } });
    }

    console.log('Restored Foreign Guests and Bookings.');
  } else {
    console.log('Foreign Guests already exist.');
  }
}

main().finally(() => prisma.$disconnect());
