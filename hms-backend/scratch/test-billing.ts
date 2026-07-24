import prisma from './prisma';
import { settlePayment } from './services/billing.service';
import { Request, Response } from 'express';
import { getFolio } from './controllers/bookingController';
import { getInvoicePdf } from './controllers/invoiceController';

async function mockFolioReqRes(id: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = { params: { id }, body: {} } as any as Request;
    const res = {
      status: (code: number) => ({
        json: (data: any) => resolve({ status: code, data })
      }),
      json: (data: any) => resolve({ status: 200, data })
    } as Response;

    getFolio(req, res, (err: any) => reject(err || new Error('Next called')));
  });
}

async function runTests() {
  console.log('Testing Billing Module validations...');
  
  let room = await prisma.room.findFirst({ where: { number: 'TEST-105' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: { number: 'TEST-105', floor: 1, roomTypeId: roomType.id, price: 100, status: 'AVAILABLE' }
    });
  }

  let guest = await prisma.guest.findFirst({ where: { phone: '5555555557' } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: 'Billing Tester', phone: '5555555557', guestType: 'LOCAL' }
    });
  }

  try {
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });

    const checkIn = new Date(); checkIn.setDate(checkIn.getDate() - 1);
    const checkOut = new Date();
    
    // Booking has a discount of 10 applied
    const b1 = await prisma.booking.create({
      data: {
        bookingType: 'LOCAL',
        guestId: guest.id,
        roomId: room.id,
        checkIn,
        checkOut,
        guestCount: 1,
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'CHECKED_IN'
      }
    });

    console.log('1. Setting up invoice with discount...');
    // Add invoice to test discount logic
    await prisma.invoice.create({
      data: {
        bookingId: b1.id,
        items: {
          create: [
            { description: 'Room Charges (1 nights)', amount: 100 },
            { description: 'Tax (10%)', amount: 10 },
            { description: 'Discount', amount: -20 } // -20 discount
          ]
        }
      }
    });

    // 2. Fetch Folio
    const fRes = await mockFolioReqRes(b1.id);
    console.log('2. Folio fetched. Discount is:', fRes.data.discount, 'Total:', fRes.data.totalAmount, fRes.data);

    if (fRes.data.discount !== 20) throw new Error(`Discount should be 20, got ${fRes.data.discount}`);
    if (fRes.data.totalAmount !== 90) throw new Error(`Total should be 90, got ${fRes.data.totalAmount}`);

    console.log('3. Settling payment via Credit Card...');
    const p1 = await settlePayment(b1.id, 50, 'Credit Card');
    console.log('   Payment 1 processed. Method:', p1.payment.method, 'Amount:', p1.payment.amount);

    console.log('4. Settling payment via Cash...');
    const p2 = await settlePayment(b1.id, 40, 'Cash');
    console.log('   Payment 2 processed. Method:', p2.payment.method, 'Amount:', p2.payment.amount);
    console.log('   Booking Checked Out?', p2.checkedOut);

    if (!p2.checkedOut) throw new Error('Booking did not check out after full payment');

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await prisma.housekeepingTask.deleteMany({ where: { roomId: room.id } });
    await prisma.payment.deleteMany({ where: { booking: { roomId: room.id } } });
    await prisma.invoiceItem.deleteMany({ where: { invoice: { booking: { roomId: room.id } } } });
    await prisma.invoice.deleteMany({ where: { booking: { roomId: room.id } } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.guest.delete({ where: { id: guest.id } });
  }
}

runTests();
