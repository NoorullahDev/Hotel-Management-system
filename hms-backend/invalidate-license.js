const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function invalidate() {
  const license = await prisma.license.findFirst();
  if (license) {
    await prisma.license.update({
      where: { id: license.id },
      data: { status: 'Expired', expiryDate: new Date(Date.now() - 100000) }
    });
    console.log('License invalidated.');
  } else {
    console.log('No license found.');
  }
}
invalidate().finally(() => prisma.$disconnect());
