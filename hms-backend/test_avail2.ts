import prisma from './src/prisma';

async function run() {
  const checkInDate = new Date();
  const checkOutDate = new Date(Date.now() + 86400000);

  const rooms = await prisma.room.findMany({
    where: {
      status: 'AVAILABLE',
      bookings: {
        none: {
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          AND: [
            { checkIn: { lt: checkOutDate } },
            { checkOut: { gt: checkInDate } }
          ]
        }
      }
    }
  });

  console.log('Available rooms returned with filter:', rooms.length);
  
  const allAvailable = await prisma.room.count({
    where: { status: 'AVAILABLE' }
  });
  console.log('Total AVAILABLE status rooms:', allAvailable);

  const allCount = await prisma.room.count();
  console.log('Total rooms:', allCount);
}

run().catch(console.error).finally(() => prisma.$disconnect());
