import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const uploadsDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadsDir).filter(f => f.startsWith('image-') && (f.endsWith('.jpg') || f.endsWith('.jpeg')));
  
  // Sort files predictably
  files.sort();

  const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
  const roomTypes = await prisma.roomType.findMany();
  
  let imgIndex = 0;
  for (const room of rooms) {
    if (imgIndex < files.length) {
      await prisma.room.update({
        where: { id: room.id },
        data: { imageUrl: '/uploads/' + files[imgIndex] }
      });
      console.log(`Updated room ${room.number} with image ${files[imgIndex]}`);
      imgIndex++;
    }
  }

  let newRoomNum = 301;
  while (imgIndex < files.length) {
    await prisma.room.create({
      data: {
        number: newRoomNum.toString(),
        floor: 3,
        roomTypeId: roomTypes[imgIndex % roomTypes.length].id,
        price: 300 + (imgIndex % 3) * 50,
        status: 'AVAILABLE',
        imageUrl: '/uploads/' + files[imgIndex],
        amenities: JSON.stringify(['WiFi', 'TV', 'AC', 'Mini Fridge'])
      }
    });
    console.log(`Created new room ${newRoomNum} with image ${files[imgIndex]}`);
    newRoomNum++;
    imgIndex++;
  }
}

main().finally(() => prisma.$disconnect());
