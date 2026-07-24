import { createBookingService } from '../src/services/booking.service';
import prisma from '../src/prisma';

async function main() {
  const room = await prisma.room.findFirst();
  const guest = await prisma.guest.findFirst();
  
  if (!room || !guest) {
    console.log("No room or guest found. Aborting.");
    return;
  }

  // Delete all bookings for this room so we have a clean slate
  await prisma.booking.deleteMany({ where: { roomId: room.id } });

  const bookingData = {
    roomId: room.id,
    guestId: guest.id,
    checkIn: new Date(Date.now() + 86400000), // Tomorrow
    checkOut: new Date(Date.now() + 86400000 * 3), // 3 days from now
    guestCount: 1,
    subtotal: 100,
    tax: 10,
    total: 110,
    bookingType: 'LOCAL'
  };

  try {
    console.log("Attempting booking 1...");
    const p1 = createBookingService(bookingData).then(() => console.log("b1 succeeded")).catch(e => console.log("b1 failed with:", e.message));
    
    console.log("Attempting booking 2...");
    const p2 = createBookingService(bookingData).then(() => console.log("b2 succeeded")).catch(e => console.log("b2 failed with:", e.message));

    await Promise.all([p1, p2]);
  } finally {
    await prisma.$disconnect();
  }
}

main();
