const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'prisma/dev.db'));
const adapter = new PrismaBetterSqlite3(db);
const prisma = new PrismaClient({ adapter });

async function main() {
  const payments = await prisma.payment.findMany();
  console.log("ALL PAYMENTS:", payments);
  
  const bookings = await prisma.booking.findMany({
    include: { payments: true }
  });
  console.log("BOOKINGS:", JSON.stringify(bookings.map(b => ({id: b.id, subtotal: b.subtotal, tax: b.tax, total: b.total, payments: b.payments})), null, 2));
}

main().catch(console.error);
