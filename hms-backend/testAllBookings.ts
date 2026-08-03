import prisma from './src/prisma';

async function run() {
  const bookings = await prisma.booking.findMany({ include: { payments: true } });
  console.log(bookings.map(x => ({ 
    id: x.id, 
    status: x.status,
    total: x.total.toString(), 
    payments: x.payments.map(p => p.amount.toString()) 
  })));
  await prisma.$disconnect();
}
run().catch(console.error);
