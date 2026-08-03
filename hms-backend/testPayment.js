const prisma = require('./src/prisma').default;
const { settlePayment } = require('./src/services/billing.service');

async function run() {
  const booking = await prisma.booking.findFirst({
    where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }
  });
  if (!booking) {
    console.log('No booking found');
    return prisma.$disconnect();
  }
  
  console.log('Testing payment on booking:', booking.id);
  try {
    const result = await settlePayment(booking.id, "1.00", "Cash");
    console.log('Success:', result);
  } catch (error) {
    console.error('Payment Error:', error);
  } finally {
    prisma.$disconnect();
  }
}
run();
