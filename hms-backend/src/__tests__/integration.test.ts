import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '../prisma';
import { createBookingService, checkInBookingService, checkOutBookingService } from '../services/booking.service';
import { checkoutBooking, getFolio } from '../controllers/bookingController';
import { Request, Response } from 'express';
import { vi } from 'vitest';

vi.mock('../socket', () => ({
  emitToHotel: vi.fn(),
  getIO: vi.fn().mockReturnValue({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn()
  })
}));


describe('Full System Integration Test', () => {
  let guestId: string;
  let roomId: string;
  let roomTypeId: string;
  let bookingId: string;
  let foodOrderId: string;

  beforeAll(async () => {
    // Setup settings for TAX
    await prisma.setting.upsert({
      where: { key: 'rate' },
      update: { value: '20' },
      create: { key: 'rate', category: 'tax', value: '20' }
    });
    await prisma.setting.upsert({
      where: { key: 'enabled' },
      update: { value: true as any },
      create: { key: 'enabled', category: 'tax', value: true as any }
    });
    await prisma.setting.upsert({
      where: { key: 'name' },
      update: { value: 'VAT' },
      create: { key: 'name', category: 'tax', value: 'VAT' }
    });

    const roomType = await prisma.roomType.create({ data: { name: 'Integration Suite' } });
    roomTypeId = roomType.id;

    const room = await prisma.room.create({
      data: { number: `INT-${Date.now()}`, floor: 1, roomTypeId, price: 10000, status: 'AVAILABLE' }
    });
    roomId = room.id;

    const guest = await prisma.guest.create({
      data: { name: 'Foreign Integrator', guestType: 'FOREIGN', email: `int-${Date.now()}@test.com` }
    });
    guestId = guest.id;
  });

  afterAll(async () => {
    // Cleanup
    if (bookingId) {
      await prisma.payment.deleteMany({ where: { bookingId } });
      await prisma.invoiceItem.deleteMany({ where: { invoice: { bookingId } } });
      await prisma.invoice.deleteMany({ where: { bookingId } });
      await prisma.orderItem.deleteMany({ where: { foodOrder: { bookingId } } });
      await prisma.foodOrder.deleteMany({ where: { bookingId } });
      await prisma.booking.delete({ where: { id: bookingId } });
    }
    if (roomId) await prisma.room.delete({ where: { id: roomId } });
    if (guestId) await prisma.guest.delete({ where: { id: guestId } });
    if (roomTypeId) await prisma.roomType.delete({ where: { id: roomTypeId } });
  });

  it('Booking -> Rooms -> Notifications: Creates booking and checks in', async () => {

    const checkIn = new Date('2026-07-01T12:00:00Z');
    const checkOut = new Date('2026-07-02T12:00:00Z'); // exactly 1 night
    
    // 1. Create Booking
    const booking = await createBookingService({
      bookingType: 'FOREIGN',
      guestId,
      roomId,
      checkIn,
      checkOut,
      guestCount: 2,
      subtotal: 10000,
      tax: 2000,
      total: 12000,
      status: 'CONFIRMED',
      payments: {
        create: { amount: 12000, method: 'Credit Card' }
      }
    });
    bookingId = booking.id;
    expect(booking.id).toBeDefined();

    // 2. Check in
    await checkInBookingService(bookingId, roomId);
    const updatedRoom = await prisma.room.findUnique({ where: { id: roomId } });
    expect(updatedRoom?.status).toBe('OCCUPIED');
  }, 15000);

  it('Restaurant -> Billing: Places a food order for the room', async () => {

    const order = await prisma.foodOrder.create({
      data: {
        bookingId,
        status: 'Pending',
        totalAmount: 1500,
        items: {
          create: [
            { itemName: 'Club Sandwich', quantity: 2, price: 500 },
            { itemName: 'Coffee', quantity: 2, price: 250 }
          ]
        }
      }
    });
    foodOrderId = order.id;
    expect(order.totalAmount.toNumber()).toBe(1500);
  }, 15000);

  it('Settings -> Billing -> Reports: Checkouts and generates correct Folio/Invoice', async () => {

    // We will mock req/res for checkoutBooking
    const req = { params: { id: bookingId }, body: { discount: 0 } } as unknown as Request;
    
    let jsonResponse: any;
    const res = {
      json: (data: any) => { jsonResponse = data; },
      status: (code: number) => res
    } as unknown as Response;

    let capturedError: any;
    await checkoutBooking(req, res, ((err: any) => { capturedError = err; }) as any);
    
    expect(capturedError).toBeUndefined();
    expect(jsonResponse).toBeDefined();
    expect(jsonResponse.bookingId).toBe(bookingId);

    // Check if the invoice items include the restaurant and dynamic 20% tax
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: { invoice: { bookingId } }
    });

    const roomCharge = invoiceItems.find(i => i.description.includes('Room Charges'));
    expect(roomCharge?.amount.toNumber()).toBe(10000);

    const foodCharge = invoiceItems.find(i => i.description.includes('Restaurant — Club Sandwich'));
    expect(foodCharge?.amount.toNumber()).toBe(1000);

    const taxCharge = invoiceItems.find(i => i.description.includes('VAT (20%)'));
    expect(taxCharge).toBeDefined();
    
    // Subtotal = 10000 + 1500 = 11500. Tax = 20% of 11500 = 2300.
    expect(taxCharge?.amount.toNumber()).toBe(2300);
  }, 15000);
});
