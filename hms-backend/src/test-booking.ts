import prisma from './prisma';
import { createBookingService, checkInBookingService, checkOutBookingService } from './services/booking.service';

async function runTests() {
  console.log('Testing booking functionality...');
  
  // Create a room and guest for testing
  let room = await prisma.room.findFirst({ where: { number: 'TEST-101' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: {
        number: 'TEST-101',
        floor: 1,
        roomTypeId: roomType.id,
        price: 100,
        status: 'AVAILABLE'
      }
    });
  }

  let guest = await prisma.guest.findFirst({ where: { phone: '1234567890' } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        name: 'Test Guest',
        phone: '1234567890',
        guestType: 'LOCAL'
      }
    });
  }

  // Ensure room is AVAILABLE
  await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
  await prisma.booking.deleteMany({ where: { roomId: room.id } });

  try {
    // 1. Create a booking
    console.log('1. Creating a booking...');
    const b1 = await createBookingService({
      bookingType: 'LOCAL',
      guestId: guest.id,
      roomId: room.id,
      checkIn: new Date('2026-08-01T12:00:00Z'),
      checkOut: new Date('2026-08-05T12:00:00Z'),
      guestCount: 1,
      subtotal: 400,
      tax: 40,
      total: 440,
      status: 'CONFIRMED'
    });
    console.log('   Success! Booking ID:', b1.id);

    // 2. Try to double book
    console.log('2. Trying to double book...');
    try {
      await createBookingService({
        bookingType: 'LOCAL',
        guestId: guest.id,
        roomId: room.id,
        checkIn: new Date('2026-08-02T12:00:00Z'),
        checkOut: new Date('2026-08-06T12:00:00Z'),
        guestCount: 1,
        subtotal: 400,
        tax: 40,
        total: 440,
        status: 'CONFIRMED'
      });
      console.log('   FAIL: Double booking succeeded but should have failed!');
    } catch (err: any) {
      console.log('   Success: Blocked double booking:', err.message);
    }

    // 3. Check-In the booking
    console.log('3. Checking in the booking...');
    await checkInBookingService(b1.id, room.id);
    const checkedInRoom = await prisma.room.findUnique({ where: { id: room.id } });
    console.log('   Success! Room status is now:', checkedInRoom?.status);

    // 4. Check-Out the booking
    console.log('4. Checking out the booking...');
    await checkOutBookingService(b1.id, room.id);
    const checkedOutRoom = await prisma.room.findUnique({ where: { id: room.id } });
    console.log('   Success! Room status is now:', checkedOutRoom?.status);

    console.log('All tests passed.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    // Cleanup
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.guest.delete({ where: { id: guest.id } });
  }
}

runTests();
