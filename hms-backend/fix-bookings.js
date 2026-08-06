const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixBookings() {
  const settings = await prisma.hotelSettings.findFirst();
  const taxRate = settings ? Number(settings.taxRate) : 0;

  const bookings = await prisma.booking.findMany({
    where: { total: 0 },
    include: { room: true }
  });

  for (const b of bookings) {
    if (b.status === 'CHECKED_OUT') {
      // Get invoice total if exists
      const invoice = await prisma.invoice.findUnique({
        where: { bookingId: b.id },
        include: { items: true }
      });
      if (invoice) {
        const total = invoice.items.reduce((sum, item) => sum + Number(item.amount), 0);
        await prisma.booking.update({
          where: { id: b.id },
          data: { total }
        });
        continue;
      }
    }
    
    // Estimate for others or missing invoice
    const nights = Math.max(1, Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000));
    const roomPrice = Number(b.room.price);
    const subtotal = roomPrice * nights;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    await prisma.booking.update({
      where: { id: b.id },
      data: { subtotal, tax, total }
    });
  }
  console.log(`Fixed ${bookings.length} bookings.`);
}

fixBookings().catch(console.error).finally(() => prisma.$disconnect());
