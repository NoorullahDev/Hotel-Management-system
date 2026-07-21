import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const types = await prisma.roomType.findMany();
  console.log('Room Types:', types);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
