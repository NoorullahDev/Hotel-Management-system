const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const invoice = await prisma.invoice.findFirst({
    include: { items: true, booking: { include: { payments: true, room: true } } }
  });
  console.log('Invoice items amount type:', invoice?.items[0]?.amount ? typeof invoice.items[0].amount : 'N/A');
  if (invoice?.items[0]?.amount) {
    console.log('has toNumber?', typeof invoice.items[0].amount.toNumber === 'function');
  }
  
  console.log('Booking room price type:', invoice?.booking?.room?.price ? typeof invoice.booking.room.price : 'N/A');
  if (invoice?.booking?.room?.price) {
    console.log('has toNumber?', typeof invoice.booking.room.price.toNumber === 'function');
  }
}

main().finally(() => prisma.$disconnect());
