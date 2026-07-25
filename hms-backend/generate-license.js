const crypto = require('crypto');
const readline = require('readline');

// The secret key should match the backend (or process.env.LICENSE_SECRET)
// For security, you can change this, but you MUST change it in the backend too.
const SECRET_KEY = process.env.LICENSE_SECRET || 'HMS-SECRET-LICENSE-KEY-2026-XQZ';
// Ensure secret is 32 bytes for aes-256-cbc
const normalizedSecret = crypto.createHash('sha256').update(SECRET_KEY).digest();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', normalizedSecret, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // Format: iv:encryptedData
  return iv.toString('base64') + ':' + encrypted;
}

console.log('--- HMS License Generator ---');

rl.question('Enter Hardware ID (HWID): ', (hwid) => {
  if (!hwid) {
    console.error('HWID is required!');
    process.exit(1);
  }

  rl.question('Enter validity in days (e.g., 365): ', (daysStr) => {
    const days = parseInt(daysStr, 10) || 365;
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const payload = JSON.stringify({
      hwid: hwid.trim(),
      expiryDate: expiryDate.toISOString()
    });

    const licenseKey = encrypt(payload);

    console.log('\n=============================================');
    console.log('LICENSE GENERATED SUCCESSFULLY');
    console.log('=============================================');
    console.log(`HWID: ${hwid.trim()}`);
    console.log(`Valid for: ${days} days`);
    console.log(`Expiry Date: ${expiryDate.toLocaleDateString()}`);
    console.log('\n--- YOUR LICENSE KEY ---');
    console.log(licenseKey);
    console.log('------------------------\n');

    process.exit(0);
  });
});
