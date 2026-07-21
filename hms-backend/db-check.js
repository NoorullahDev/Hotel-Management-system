const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Integrity Check ---');
  
  // Check orphaned payments
  const orphanedPayments = await prisma.payment.findMany({
    where: {
      bookingId: { notIn: (await prisma.booking.findMany({ select: { id: true } })).map(b => b.id) }
    }
  });
  console.log('Orphaned Payments:', orphanedPayments.length);
  
  // Check orphaned invoices
  const orphanedInvoices = await prisma.invoice.findMany({
    where: {
      bookingId: { notIn: (await prisma.booking.findMany({ select: { id: true } })).map(b => b.id) }
    }
  });
  console.log('Orphaned Invoices:', orphanedInvoices.length);

  // Check bookings with deleted guests
  const orphanedBookings = await prisma.booking.findMany({
    where: {
      guestId: { notIn: (await prisma.guest.findMany({ select: { id: true } })).map(g => g.id) }
    }
  });
  console.log('Orphaned Bookings (No Guest):', orphanedBookings.length);

  console.log('--- Check Complete ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
