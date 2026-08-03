const jwt = require('./node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./node_modules/@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ include: { role: true } });
  
  const envPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'hotel-management-system', '.env');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const secretMatch = env.match(/JWT_SECRET=(.*)/);
  const secret = secretMatch ? secretMatch[1].trim() : 'development_secret_key';

  const token = jwt.sign({ userId: user.id, role: user.role.name }, secret, { expiresIn: '1h' });

  const payRes = await fetch('http://localhost:4000/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ bookingId: '83428ce3-cdd0-4a6c-b3da-b2b37a8ed99f', amount: 10, method: 'Cash' })
  });
  
  console.log('Status:', payRes.status);
  console.log('Body:', await payRes.text());
  await prisma.$disconnect();
}
run().catch(console.error);
