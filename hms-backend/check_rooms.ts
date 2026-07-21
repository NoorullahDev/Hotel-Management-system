import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const rooms = await prisma.room.findMany();
  console.log('Total rooms:', rooms.length);
  console.log('Room IDs and numbers:', rooms.map(r => ({ id: r.id, number: r.number, image: r.images })));
}
main().finally(() => prisma.$disconnect());
