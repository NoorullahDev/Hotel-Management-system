import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Delete the randomly created rooms (301-308)
  const roomsToDelete = ['301', '302', '303', '304', '305', '306', '307', '308'];
  await prisma.room.deleteMany({
    where: { number: { in: roomsToDelete } }
  });
  console.log('Deleted the incorrect extra rooms.');

  // 2. Reset all room images to null (which restores the original Unsplash fallback)
  await prisma.room.updateMany({
    data: { imageUrl: null }
  });
  console.log('Reset all room images to restore the original placeholders.');

  // 3. Assign the WhatsApp room images to 101, 102, 103
  const backendUrl = 'http://127.0.0.1:4000';
  
  // The unique WhatsApp room images we found
  const whatsappImages = [
    '/uploads/1784575035231-WhatsApp_Image_2026-07-20_at_12.09.47_PM.jpeg', // 106KB
    '/uploads/1784575214389-WhatsApp_Image_2026-07-20_at_12.19.34_PM.jpeg', // 94KB
    '/uploads/1784663919277-WhatsApp_Image_2026-07-20_at_12.09.45_PM.jpeg'  // 79KB
  ];

  const roomsToUpdate = ['101', '102', '103'];

  for (let i = 0; i < roomsToUpdate.length; i++) {
    await prisma.room.update({
      where: { number: roomsToUpdate[i] },
      data: { imageUrl: `${backendUrl}${whatsappImages[i]}` }
    });
    console.log(`Assigned WhatsApp image ${whatsappImages[i]} to Room ${roomsToUpdate[i]}`);
  }

  console.log('Fixed all room images successfully.');
}

main().finally(() => prisma.$disconnect());
