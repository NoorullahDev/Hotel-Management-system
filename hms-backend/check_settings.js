const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.setting.findMany();
  console.log('Settings:', settings);
  
  const hotelSettings = await prisma.hotelSettings.findMany();
  console.log('HotelSettings:', hotelSettings);
}

main().finally(() => prisma.$disconnect());
