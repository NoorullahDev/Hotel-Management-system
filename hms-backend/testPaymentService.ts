import prisma from './src/prisma';
import { settlePayment } from './src/services/billing.service';

async function run() {
  try {
    const booking = await prisma.booking.findFirst({
      where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }
    });
    if (!booking) {
      console.log('No booking found');
      return process.exit(0);
    }
    
    console.log('Testing payment on booking:', booking.id);
    const result = await settlePayment(booking.id, "1.00", "Cash");
    console.log('Success:', result);
  } catch (error) {
    console.error('Payment Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}
run();
