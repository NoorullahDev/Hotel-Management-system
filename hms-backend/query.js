const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
prisma.setting.findFirst({ where: { key: 'hotelLogo' } })
  .then(console.log)
  .finally(() => prisma.$disconnect());
