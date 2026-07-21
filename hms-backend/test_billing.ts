import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function testBilling() {
  console.log('--- BILLING TEST ---');
  
  const invoices = await prisma.invoice.findMany({
    include: { items: true, payments: true, booking: true, foodOrder: true }
  });

  console.log(`Total Invoices: ${invoices.length}`);

  let duplicates = 0;
  let calculationErrors = 0;

  const invoiceMap = new Map();
  for (const inv of invoices) {
    // Check duplicates: multiple invoices for same booking or foodOrder?
    const key = inv.bookingId ? `booking-${inv.bookingId}` : (inv.foodOrderId ? `food-${inv.foodOrderId}` : null);
    if (key) {
      if (invoiceMap.has(key)) {
        console.log(`Duplicate invoice found for ${key}: ${inv.id} & ${invoiceMap.get(key).id}`);
        duplicates++;
      } else {
        invoiceMap.set(key, inv);
      }
    }

    // Check calculations
    const subtotal = inv.items.reduce((acc, item) => acc + item.amount.toNumber(), 0);
    const tax = Number((subtotal * (inv.taxRate.toNumber() / 100)).toFixed(2));
    const discount = inv.discount.toNumber();
    const calculatedTotal = subtotal + tax - discount;

    if (Math.abs(calculatedTotal - inv.totalAmount.toNumber()) > 0.01) {
      console.log(`Calculation mismatch on Invoice ${inv.id}: DB Total = ${inv.totalAmount}, Calc = ${calculatedTotal} (Sub=${subtotal}, Tax=${tax}, Disc=${discount})`);
      calculationErrors++;
    }

    // Check payment status
    const totalPaid = inv.payments.reduce((acc, p) => acc + p.amount.toNumber(), 0);
    const expectedStatus = totalPaid >= inv.totalAmount.toNumber() - 0.01 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'UNPAID');
    if (inv.status !== expectedStatus && inv.status !== 'VOID') {
       console.log(`Status mismatch on Invoice ${inv.id}: DB Status = ${inv.status}, Expected = ${expectedStatus} (TotalPaid = ${totalPaid})`);
       calculationErrors++;
    }
  }

  console.log(`Summary: ${duplicates} duplicates, ${calculationErrors} calculation/status errors.`);
}

testBilling().catch(console.error).finally(() => prisma.$disconnect());
