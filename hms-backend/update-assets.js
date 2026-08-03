const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasourceUrl: 'file:./prisma/dev.db'
});

async function main() {
  await prisma.hotelSettings.updateMany({
    data: {
      hotelLogo: '/uploads/logo.jpg',
      loginBackgroundImage: '/uploads/background.jpg',
      hotelName: 'Farooq Hotel'
    }
  });
  console.log('Updated logo and background.');
}
main().finally(() => prisma.$disconnect());
