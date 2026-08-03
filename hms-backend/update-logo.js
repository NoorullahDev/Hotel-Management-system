const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.hotelSettings.updateMany({
  data: {
    hotelLogo: '/uploads/logo.png',
    hotelName: 'My Hotel'
  }
}).then(() => console.log('Updated logo')).finally(() => prisma.$disconnect());
