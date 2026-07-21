import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const backendUrl = 'http://127.0.0.1:4000';
  
  const firstImage = '/uploads/1784575214389-WhatsApp_Image_2026-07-20_at_12.19.34_PM.jpeg'; // 94KB
  const secondImage = '/uploads/1784575035231-WhatsApp_Image_2026-07-20_at_12.09.47_PM.jpeg'; // 106KB

  // Reset 101, 102, 103 first
  await prisma.room.updateMany({
    where: { number: { in: ['101', '102', '103', '104', '105', '106', '107', '108', '109', '110', '201', '202'] } },
    data: { imageUrl: null }
  });

  // 1. "Use the first image... for the room(s) where it was originally assigned." -> Room 101
  await prisma.room.update({
    where: { number: '101' },
    data: { imageUrl: `${backendUrl}${firstImage}` }
  });
  console.log('Assigned first image to Room 101');

  // 2. "Use the second image... for the two rooms where it was originally assigned." -> Room 102, Room 103
  await prisma.room.update({
    where: { number: '102' },
    data: { imageUrl: `${backendUrl}${secondImage}` }
  });
  await prisma.room.update({
    where: { number: '103' },
    data: { imageUrl: `${backendUrl}${secondImage}` }
  });
  console.log('Assigned second image to Rooms 102 and 103');

  // 3. Remove dummy Foreign Guests and Bookings
  const foreignGuests = await prisma.guest.findMany({ where: { guestType: 'FOREIGN' } });
  if (foreignGuests.length > 0) {
    const guestIds = foreignGuests.map(g => g.id);
    await prisma.booking.deleteMany({
      where: { guestId: { in: guestIds } }
    });
    await prisma.guest.deleteMany({
      where: { id: { in: guestIds } }
    });
    console.log('Deleted dummy Foreign Guests and Bookings.');
  }
}

main().finally(() => prisma.$disconnect());
