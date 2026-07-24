import prisma from './prisma';
import { createBookingService, checkInBookingService, checkOutBookingService } from './services/booking.service';
import { Request, Response } from 'express';
import { checkInBooking } from './controllers/bookingController';

async function mockCheckInReqRes(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = { params: { id } } as any as Request;
    const res = {
      status: (code: number) => ({
        json: (data: any) => resolve({ status: code, data })
      }),
      json: (data: any) => resolve({ status: 200, data })
    } as Response;

    checkInBooking(req, res, (err: any) => reject(err || new Error('Next called')));
  });
}

async function runTests() {
  console.log('Testing Check-In module validations...');
  
  let room = await prisma.room.findFirst({ where: { number: 'TEST-103' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: { number: 'TEST-103', floor: 1, roomTypeId: roomType.id, price: 100, status: 'AVAILABLE' }
    });
  }

  let guest = await prisma.guest.findFirst({ where: { phone: '5555555555' } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: 'Checkin Tester', phone: '5555555555', guestType: 'LOCAL' }
    });
  }

  try {
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });

    // Helper to create a quick booking with specific check-in date
    const createTestBooking = async (checkIn: Date, status: any = 'CONFIRMED') => {
      const b = await prisma.booking.create({
        data: {
          bookingType: 'LOCAL',
          guestId: guest.id,
          roomId: room.id,
          checkIn,
          checkOut: new Date(checkIn.getTime() + 86400000),
          guestCount: 1,
          subtotal: 100,
          tax: 10,
          total: 110,
          status
        }
      });
      return b;
    };

    // 1. Check in a cancelled booking
    console.log('1. Checking in CANCELLED booking...');
    const b1 = await createTestBooking(new Date(), 'CANCELLED');
    const r1 = await mockCheckInReqRes(b1.id);
    console.log('   Result:', r1.data.message);

    // 2. Check in a future booking
    console.log('2. Checking in FUTURE booking...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const b2 = await createTestBooking(tomorrow, 'CONFIRMED');
    const r2 = await mockCheckInReqRes(b2.id);
    console.log('   Result:', r2.data.message);

    // 3. Check in an already checked-in booking
    console.log('3. Checking in already CHECKED_IN booking...');
    const b3 = await createTestBooking(new Date(), 'CHECKED_IN');
    const r3 = await mockCheckInReqRes(b3.id);
    console.log('   Result:', r3.data.message);

    // 4. Valid check-in today
    console.log('4. Checking in VALID booking today...');
    const b4 = await createTestBooking(new Date(), 'CONFIRMED');
    const r4 = await mockCheckInReqRes(b4.id);
    console.log('   Success! Room status updated:', r4.data.status); // Will output updated booking info

    const checkedInRoom = await prisma.room.findUnique({ where: { id: room.id } });
    console.log('   Atomic check passed? Room status is:', checkedInRoom?.status);

    // 5. Checkout the valid booking
    console.log('5. Checking out the booking...');
    await checkOutBookingService(b4.id, room.id);
    const checkedOutRoom = await prisma.room.findUnique({ where: { id: room.id } });
    console.log('   Checkout Success! Room status is now:', checkedOutRoom?.status);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.guest.delete({ where: { id: guest.id } });
  }
}

runTests();
