const jwt = require('./node_modules/jsonwebtoken');
const fs = require('fs');
const path = require('path');

async function run() {
  const envPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'hotel-management-system', '.env');
  const env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const secretMatch = env.match(/JWT_SECRET=(.*)/);
  const secret = secretMatch ? secretMatch[1].trim() : 'development_secret_key';

  // We know booking 83428ce3-cdd0-4a6c-b3da-b2b37a8ed99f exists from testPaymentService.ts
  const token = jwt.sign({ userId: 'dummy-admin', role: 'Manager' }, secret, { expiresIn: '1h' });

  console.log('Sending request to /api/payments for booking 83428ce3...');
  const payRes = await fetch('http://localhost:4000/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ bookingId: '83428ce3-cdd0-4a6c-b3da-b2b37a8ed99f', amount: 10, method: 'Cash' })
  });
  
  console.log('Status:', payRes.status);
  console.log('Body:', await payRes.text());
}
run().catch(console.error);
