import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db.bak'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const rooms = await prisma.room.findMany();
  console.log('Total rooms:', rooms.length);
  console.log('Room IDs and numbers:', rooms.map(r => ({ id: r.id, number: r.number, image: r.images })));
}
main().finally(() => prisma.$disconnect());
