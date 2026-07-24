import prisma from './prisma';
import { Request, Response } from 'express';
import { createOrder, verifyGuest, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, createCategory, deleteCategory } from './controllers/restaurantController';
import { getFolio } from './controllers/bookingController';

async function mockReqRes(handler: any, reqData: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = { ...reqData } as any as Request;
    const res = {
      status: (code: number) => ({
        json: (data: any) => resolve({ status: code, data })
      }),
      json: (data: any) => resolve({ status: 200, data })
    } as Response;

    handler(req, res, (err: any) => reject(err || new Error('Next called')));
  });
}

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
  console.log('Testing Restaurant Module validations...');
  
  let room = await prisma.room.findFirst({ where: { number: 'TEST-RESTO' } });
  if (!room) {
    const roomType = await prisma.roomType.findFirst() || await prisma.roomType.create({ data: { name: 'Test Type' } });
    room = await prisma.room.create({
      data: { number: 'TEST-RESTO', floor: 1, roomTypeId: roomType.id, price: 100, status: 'AVAILABLE' }
    });
  }

  let guest = await prisma.guest.findFirst({ where: { phone: '5555555558' } });
  if (!guest) {
    guest = await prisma.guest.create({
      data: { name: 'Resto Tester', phone: '5555555558', guestType: 'LOCAL' }
    });
  }

  try {
    await prisma.room.update({ where: { id: room.id }, data: { status: 'AVAILABLE' } });
    await prisma.booking.deleteMany({ where: { roomId: room.id } });

    // 1. Setup Active Booking
    const checkIn = new Date(); checkIn.setDate(checkIn.getDate() - 1);
    const checkOut = new Date();
    
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

    console.log('1. Testing invalid order quantity (-5)...');
    const r1 = await mockReqRes(createOrder, {
      body: {
        roomNumber: room.number,
        items: [{ name: 'Test Pizza', quantity: -5, price: 10 }]
      }
    });
    if (r1.status === 400 && r1.data.message.includes('greater than zero')) {
      console.log('   Success! Blocked invalid quantity.');
    } else {
      throw new Error('Failed to block negative quantity');
    }

    console.log('2. Testing menu management flow (create/edit/delete)...');
    const catRes = await mockReqRes(createCategory, { body: { name: 'TestCategory' } });
    const itemRes = await mockReqRes(createMenuItem, {
      body: { name: 'TestPasta', category: 'TestCategory', price: 15, imageUrl: '' }
    });
    await mockReqRes(updateMenuItem, {
      params: { id: itemRes.data.id },
      body: { name: 'TestPasta 2', category: 'TestCategory', price: 20, imageUrl: '' }
    });
    const itemsList = await mockReqRes(getMenuItems, {});
    const pasta = itemsList.data.find((i: any) => i.id === itemRes.data.id);
    if (!pasta || Number(pasta.price) !== 20) throw new Error(`Menu item update failed: ${pasta?.price}`);
    console.log('   Success! Menu CRUD flows correctly.');

    console.log('3. Test item price change AFTER order...');
    // Create an order with original price
    const orderRes = await mockReqRes(createOrder, {
      body: {
        roomNumber: room.number,
        items: [{ name: 'TestPasta 2', quantity: 2, price: 20 }] // Total: 40
      }
    });
    
    // Now update menu item price to 100
    await mockReqRes(updateMenuItem, {
      params: { id: itemRes.data.id },
      body: { name: 'TestPasta 2', category: 'TestCategory', price: 100, imageUrl: '' }
    });

    // Check Folio to ensure order kept original price
    const fRes = await mockFolioReqRes(b1.id);
    const pastaCharge = fRes.data.items.find((i: any) => i.description.includes('TestPasta'));
    console.log(`   Success! Folio charge is ${pastaCharge.amount} (Expected 40, despite price jumping to 100).`);
    if (Number(pastaCharge.amount) !== 40) throw new Error('Order price retroactively changed!');

    // Cleanup menu
    await mockReqRes(deleteMenuItem, { params: { id: itemRes.data.id } });
    await mockReqRes(deleteCategory, { params: { id: catRes.data.id } });

    console.log('4. Testing order against un-checked-in booking...');
    await prisma.booking.update({ where: { id: b1.id }, data: { status: 'CHECKED_OUT' } });
    const r4 = await mockReqRes(createOrder, {
      body: {
        roomNumber: room.number,
        items: [{ name: 'Water', quantity: 1, price: 2 }]
      }
    });
    if (r4.status === 400 && r4.data.message.includes('No active CHECKED_IN booking')) {
      console.log('   Success! Blocked ordering to a CHECKED_OUT room.');
    } else {
      throw new Error('Allowed order to checked-out room');
    }

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
    await prisma.menuItem.deleteMany({ where: { category: 'TestCategory' } });
    await prisma.menuCategory.deleteMany({ where: { name: 'TestCategory' } });
  }
}

runTests();
