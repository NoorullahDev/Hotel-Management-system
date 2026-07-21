import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- STARTING DATABASE TESTING AND SYNCHRONIZATION ---');
  
  // 1. CRUD Verification
  console.log('\n[1] Performing CRUD Verification...');
  try {
    // Create
    console.log('    - Creating dummy room type, room, and guest...');
    const roomType = await prisma.roomType.create({
      data: { name: 'DB Test Suite Room' }
    });
    const room = await prisma.room.create({
      data: {
        number: `TEST-${Date.now()}`,
        floor: 99,
        roomTypeId: roomType.id,
        price: 9999,
        status: 'AVAILABLE',
      }
    });
    const guest = await prisma.guest.create({
      data: {
        name: 'DB Test Guest',
        email: `test-${Date.now()}@example.com`,
        guestType: 'LOCAL'
      }
    });
    const booking = await prisma.booking.create({
      data: {
        bookingType: 'LOCAL',
        guestId: guest.id,
        roomId: room.id,
        checkIn: new Date(),
        checkOut: new Date(Date.now() + 86400000),
        guestCount: 1,
        status: 'CONFIRMED',
        subtotal: 9999,
        tax: 0,
        total: 9999,
      }
    });
    console.log(`    ✓ Created Booking ID: ${booking.id}`);

    // Read
    console.log('    - Reading dummy booking...');
    const readBooking = await prisma.booking.findUnique({ where: { id: booking.id }, include: { guest: true, room: true } });
    if (!readBooking) throw new Error('Failed to read booking');
    console.log(`    ✓ Successfully read Booking with Guest: ${readBooking.guest.name}`);

    // Update
    console.log('    - Updating dummy booking status...');
    await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
    console.log(`    ✓ Successfully updated Booking status to CANCELLED`);

    // Delete
    console.log('    - Deleting dummy records...');
    await prisma.booking.delete({ where: { id: booking.id } });
    await prisma.guest.delete({ where: { id: guest.id } });
    await prisma.room.delete({ where: { id: room.id } });
    await prisma.roomType.delete({ where: { id: roomType.id } });
    console.log(`    ✓ Successfully deleted all dummy records`);
    
  } catch (error) {
    console.error('    ❌ CRUD Verification Failed:', error);
  }

  // 2. Data Synchronization (Local/Foreign Alignment)
  console.log('\n[2] Checking Data Synchronization (GuestType vs BookingType)...');
  let syncFixed = 0;
  const bookings = await prisma.booking.findMany({ include: { guest: true } });
  for (const b of bookings) {
    if (b.bookingType !== b.guest.guestType) {
      console.log(`    - Mismatch found: Booking ${b.id} (${b.bookingType}) <-> Guest ${b.guest.id} (${b.guest.guestType})`);
      // Fix: Align guest to booking type (assuming booking context is the master source)
      await prisma.guest.update({
        where: { id: b.guestId },
        data: { guestType: b.bookingType }
      });
      syncFixed++;
    }
  }
  console.log(`    ✓ Fixed ${syncFixed} type synchronization mismatches.`);

  // 3. Missing Records Validation (Invoices for Bookings)
  console.log('\n[3] Checking for Missing Records (Invoices for Bookings)...');
  let missingInvoicesFixed = 0;
  const bookingsWithoutInvoice = await prisma.booking.findMany({
    where: {
      invoice: null
    }
  });
  for (const b of bookingsWithoutInvoice) {
    await prisma.invoice.create({
      data: {
        bookingId: b.id,
      }
    });
    missingInvoicesFixed++;
  }
  console.log(`    ✓ Created ${missingInvoicesFixed} missing invoices.`);

  // 4. Duplicate Records Cleanup (Guests)
  console.log('\n[4] Checking for Duplicate Guests...');
  const allGuests = await prisma.guest.findMany();
  const emailMap = new Map<string, string[]>(); // email -> array of guest ids
  const phoneMap = new Map<string, string[]>(); // phone -> array of guest ids

  for (const g of allGuests) {
    if (g.email) {
      if (!emailMap.has(g.email)) emailMap.set(g.email, []);
      emailMap.get(g.email)!.push(g.id);
    }
    if (g.phone) {
      if (!phoneMap.has(g.phone)) phoneMap.set(g.phone, []);
      phoneMap.get(g.phone)!.push(g.id);
    }
  }

  let duplicatesMerged = 0;
  
  // Merge function
  const mergeGuests = async (ids: string[]) => {
    if (ids.length <= 1) return;
    const primaryId = ids[0];
    const duplicateIds = ids.slice(1);
    
    for (const dupId of duplicateIds) {
      // Check if dupId exists (might have been deleted in a previous merge)
      const exists = await prisma.guest.findUnique({ where: { id: dupId } });
      if (!exists) continue;
      
      // Reassign bookings
      await prisma.booking.updateMany({
        where: { guestId: dupId },
        data: { guestId: primaryId }
      });
      // Delete duplicate
      await prisma.guest.delete({ where: { id: dupId } });
      duplicatesMerged++;
    }
  };

  for (const [email, ids] of emailMap.entries()) {
    if (ids.length > 1) await mergeGuests(ids);
  }
  
  // Re-fetch guests for phone duplicates as some might have been deleted by email merge
  const allGuestsAfterEmailMerge = await prisma.guest.findMany();
  const phoneMap2 = new Map<string, string[]>();
  for (const g of allGuestsAfterEmailMerge) {
    if (g.phone) {
      if (!phoneMap2.has(g.phone)) phoneMap2.set(g.phone, []);
      phoneMap2.get(g.phone)!.push(g.id);
    }
  }
  for (const [phone, ids] of phoneMap2.entries()) {
    if (ids.length > 1) await mergeGuests(ids);
  }

  console.log(`    ✓ Merged ${duplicatesMerged} duplicate guest records.`);

  console.log('\n--- DATABASE TESTING AND SYNCHRONIZATION COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
