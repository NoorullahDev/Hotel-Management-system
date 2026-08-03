const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.payment.create({
      data: {
        bookingId: 'test-id',
        amount: "10.00",
        method: 'Cash'
      }
    });
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
