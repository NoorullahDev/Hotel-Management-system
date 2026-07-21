import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const images = [
    '/uploads/image-1783498710337-726995554.jpg',
    '/uploads/image-1783498832676-558963215.jpg',
    '/uploads/image-1783498885428-570699412.jpg',
    '/uploads/image-1783498965101-287191311.jpg',
    '/uploads/image-1783499025995-683596069.jpg',
    '/uploads/image-1783499327129-717769065.jpg'
  ];

  const roomsToUpdate = ['101', '102', '103', '104', '105', '106'];

  for (let i = 0; i < roomsToUpdate.length; i++) {
    await prisma.room.update({
      where: { number: roomsToUpdate[i] },
      data: { imageUrl: images[i] }
    });
    console.log(`Updated room ${roomsToUpdate[i]} with image ${images[i]}`);
  }
}

main().finally(() => prisma.$disconnect());
