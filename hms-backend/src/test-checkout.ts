import prisma from './prisma';
import { settlePayment } from './services/billing.service';
import { Request, Response } from 'express';
import { checkoutBooking } from './controllers/bookingController';

async function mockCheckoutReqRes(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = { params: { id }, body: {} } as any as Request;
    const res = {
      status: (code: number) => ({
        json: (data: any) => resolve({ status: code, data })
      }),
      json: (data: any) => resolve({ status: 200, data })
    } as Response;

    checkoutBooking(req, res, (err: any) => reject(err || new Error('Next called')));
  });
}

async function runTests() {
  console.log('Testing Check-Out module validations...');
  
  let room = await prisma.room.findFirst({ where: { number: 'TEST-104' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: { number: 'TEST-104', floor: 1, roomTypeId: roomType.id, price: 100, status: 'AVAILABLE' }
    });
  }

  let guest = await prisma.guest.findFirst({ where: { phone: '5555555556' } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: 'Checkout Tester', phone: '5555555556', guestType: 'LOCAL' }
    });
  }

  try {
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });

    // Helper to create a quick booking
    const checkIn = new Date(); checkIn.setDate(checkIn.getDate() - 2); // 2 nights
    const checkOut = new Date();
    
    const b1 = await prisma.booking.create({
      data: {
        bookingType: 'LOCAL',
        guestId: guest.id,
        roomId: room.id,
        checkIn,
        checkOut,
        guestCount: 1,
        subtotal: 200, // 2 nights * 100
        tax: 20, // 10%
        total: 220,
        status: 'CHECKED_IN'
      }
    });

    // 1. Add food order
    console.log('1. Adding food order and generating folio...');
    await prisma.foodOrder.create({
      data: {
        bookingId: b1.id,
        status: 'DELIVERED',
        totalAmount: 50,
        items: {
          create: [{ itemName: 'Test Burger', quantity: 2, price: 25 }]
        }
      }
    });

    // Simulate payment to generate invoice
    const r1 = await settlePayment(b1.id, 10, 'Cash');
    console.log('   Partial payment processed. Invoice generated. Total items:', r1.invoice?.items.length);
    console.log('   Booking status is:', r1.updatedBooking?.status || b1.status);
    
    let dbBooking = await prisma.booking.findUnique({ where: { id: b1.id } });
    if (dbBooking?.status === 'CHECKED_OUT') throw new Error('Booking prematurely checked out on partial payment');
    
    // Total should be: 200 room + 50 food = 250 subtotal. + tax (10% = 25) = 275 total.
    const expectedTotal = 275;
    
    console.log('2. Testing Checkout with unpaid balance...');
    const r2 = await mockCheckoutReqRes(b1.id);
    if (r2.status === 400) console.log('   Success! Blocked checkout with unpaid balance:', r2.data.message);
    else throw new Error('Failed to block checkout with unpaid balance');

    console.log('3. Submitting double payment rapidly (concurrent requests)...');
    try {
      await Promise.all([
        settlePayment(b1.id, 265, 'Cash'), // 275 total - 10 previously paid = 265
        settlePayment(b1.id, 265, 'Cash')
      ]);
    } catch (err: any) {
      console.log('   Double payment blocked:', err.message);
    }

    console.log('4. Verifying final state...');
    const b = await prisma.booking.findUnique({ where: { id: b1.id }, include: { payments: true } });
    dbBooking = b as any;
    const finalRoom = await prisma.room.findUnique({ where: { id: room.id } });
    const hkTask = await prisma.housekeepingTask.findFirst({ where: { roomId: room.id, status: 'PENDING' } });
    
    console.log('   Booking status:', dbBooking?.status);
    console.log('   Room status:', finalRoom?.status);
    console.log('   Housekeeping task created:', !!hkTask);
    const paidAmount = (dbBooking as any)?.payments?.reduce((sum: any, p: any) => sum + Number(p.amount), 0) || 0;
    console.log('   Total paid:', paidAmount);

    if (paidAmount !== 275) throw new Error(`Overcharged! Expected 275, got ${paidAmount}`);
    if (dbBooking?.status !== 'CHECKED_OUT') throw new Error('Booking not checked out');
    if (finalRoom?.status !== 'CLEANING') throw new Error('Room not set to CLEANING');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.housekeepingTask.deleteMany({ where: { roomId: room.id } });
    await prisma.payment.deleteMany({ where: { booking: { roomId: room.id } } });
    await prisma.orderItem.deleteMany({ where: { foodOrder: { booking: { roomId: room.id } } } });
    await prisma.foodOrder.deleteMany({ where: { booking: { roomId: room.id } } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { booking: { roomId: room.id } } } });
    await prisma.invoice.deleteMany({ where: { booking: { roomId: room.id } } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.guest.delete({ where: { id: guest.id } });
  }
}

runTests();
