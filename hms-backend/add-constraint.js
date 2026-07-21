const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS btree_gist;");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Booking" ADD CONSTRAINT overlapping_bookings EXCLUDE USING gist ("roomId" WITH =, tsrange("checkIn", "checkOut", '[)') WITH &&) WHERE (status IN ('CONFIRMED', 'CHECKED_IN'));`);
    console.log('Exclusion constraint added successfully');
  } catch (e) {
    if (e.message.includes('already exists')) {
      console.log('Constraint already exists');
    } else {
      console.error(e);
      throw e;
    }
  }
}

main().finally(() => prisma.$disconnect());
