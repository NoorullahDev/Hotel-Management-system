import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const rooms = await prisma.room.findMany();
  for (const room of rooms) {
    if (room.imageUrl && room.imageUrl.startsWith('/uploads/')) {
      const newUrl = `http://127.0.0.1:4000${room.imageUrl}`;
      await prisma.room.update({
        where: { id: room.id },
        data: { imageUrl: newUrl }
      });
      console.log(`Updated room ${room.number} imageUrl to ${newUrl}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
