import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db.bak'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const rooms = await prisma.room.findMany();
  console.log('Total rooms:', rooms.length);
  console.log('Room imageUrls:', rooms.filter(r => r.imageUrl).map(r => ({ number: r.number, imageUrl: r.imageUrl })));
}
main().finally(() => prisma.$disconnect());
