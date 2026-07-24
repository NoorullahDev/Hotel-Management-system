import prisma from './prisma';
import { createBookingService } from './services/booking.service';
import { Request, Response } from 'express';
import { createBooking } from './controllers/bookingController';

async function mockReqRes(body: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = { body } as Request;
    const res = {
      status: (code: number) => ({
        json: (data: any) => resolve({ status: code, data })
      }),
      json: (data: any) => resolve({ status: 200, data })
    } as Response;

    createBooking(req, res, (err: any) => reject(err || new Error('Next called with no err')));
  });
}

async function runTests() {
  console.log('Testing Foreign Guest booking flow...');
  
  let room = await prisma.room.findFirst({ where: { number: 'TEST-102' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: { number: 'TEST-102', floor: 1, roomTypeId: roomType.id, price: 100, status: 'AVAILABLE' }
    });
  }

  try {
    // Test 1: Submit missing passport for FOREIGN booking
    console.log('1. Submitting FOREIGN without passport...');
    const res1 = await mockReqRes({
      bookingType: 'FOREIGN',
      guest: { name: 'Foreign Dude', phone: '123', idType: 'Passport', idNumber: '' },
      roomId: room.id, checkIn: '2026-08-01', checkOut: '2026-08-02', guestCount: 1, subtotal: 100, tax: 10, total: 110
    });
    if (res1.status === 400) console.log('   Success! Blocked missing passport:', res1.data.message);
    else throw new Error('Failed to block missing passport');

    // Test 2: Submit valid FOREIGN booking with arrival time
    console.log('2. Submitting valid FOREIGN booking...');
    const res2 = await mockReqRes({
      bookingType: 'FOREIGN',
      guest: { name: 'Foreign Dude', phone: '123', idType: 'Passport', idNumber: 'AB12345', guestType: 'FOREIGN' },
      roomId: room.id, 
      checkIn: '2026-08-05T14:30:00.000Z', 
      checkOut: '2026-08-06T12:00:00.000Z', 
      arrivalTime: '2026-08-05T14:30:00.000Z',
      guestCount: 1, subtotal: 100, tax: 10, total: 110
    });
    console.log('   Success! Created booking ID:', res2.data.id);
    const savedGuest = await prisma.guest.findUnique({ where: { id: res2.data.guestId } });
    console.log('   Guest type saved as:', savedGuest?.guestType);
    console.log('   Guest passport saved as:', savedGuest?.idNumber);

    // Test 3: Create LOCAL booking to ensure regression doesn't happen
    console.log('3. Submitting LOCAL booking...');
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });

    const res3 = await mockReqRes({
      bookingType: 'LOCAL',
      guest: { name: 'Local Dude', phone: '987', idType: 'CNIC', idNumber: '111-222' },
      roomId: room.id, checkIn: '2026-08-08', checkOut: '2026-08-09', guestCount: 1, subtotal: 100, tax: 10, total: 110
    });
    console.log('   Success! Created LOCAL booking ID:', res3.data.id);

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
  }
}

runTests();
