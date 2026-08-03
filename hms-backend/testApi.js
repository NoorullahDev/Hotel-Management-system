const fs = require('fs');
const path = require('path');
const jwt = require('./node_modules/jsonwebtoken');
const { PrismaClient } = require('./node_modules/@prisma/client');

async function run() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({ include: { role: true } });
  if (!user) return console.log('No user');

  const booking = await prisma.booking.findFirst({ where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } } });
  if (!booking) return console.log('No booking');

  const envPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'hotel-management-system', '.env');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const secretMatch = env.match(/JWT_SECRET=(.*)/);
  const secret = secretMatch ? secretMatch[1].trim() : process.env.JWT_SECRET || 'development_secret_key';

  const token = jwt.sign({ userId: user.id, role: user.role.name }, secret, { expiresIn: '1h' });

  const res = await fetch('http://localhost:4000/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ bookingId: booking.id, amount: 1, method: 'Cash' })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Body:', text);
  
  await prisma.$disconnect();
}
run().catch(console.error);
