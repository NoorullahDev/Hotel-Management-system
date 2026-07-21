/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  const invoice = await prisma.invoice.findFirst();
  if (invoice) {
    console.log('Invoice found:', invoice.id);
    const res = await fetch(`http://127.0.0.1:4000/api/invoices/${invoice.id}/pdf`, {
        headers: { 'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}` }
    });
    console.log('PDF response status:', res.status);
    if(res.ok) console.log('Invoice PDF generated successfully.');
  } else {
    console.log('No invoices to verify.');
  }
}
verify().finally(() => prisma.$disconnect());
