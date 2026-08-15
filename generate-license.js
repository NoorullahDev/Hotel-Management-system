const crypto = require('crypto');
const path = require('path');

// Load LICENSE_SECRET from hms-backend/.env if it is not already set, so the
// tool can be run straight from the repo root without extra setup. Resolve
// dotenv from the backend's node_modules since it is not installed at root.
let dotenv = null;
try { dotenv = require('dotenv'); } catch (e) {
  dotenv = require(path.join(__dirname, 'hms-backend', 'node_modules', 'dotenv'));
}
dotenv.config({ path: path.join(__dirname, 'hms-backend', '.env') });

// This must match LICENSE_SECRET in hms-backend/.env and
// hms-desktop/secrets.env (the value shipped with each installation).
const SECRET_KEY = process.env.LICENSE_SECRET;
if (!SECRET_KEY) {
  console.error(
    'Error: LICENSE_SECRET is not defined.\n' +
    'Set it in hms-backend/.env (same value as hms-desktop/secrets.env) and try again.'
  );
  process.exit(1);
}
const normalizedSecret = crypto.createHash('sha256').update(SECRET_KEY).digest();

function generateLicense(hwid, days) {
  if (!hwid) {
    console.error("Error: Please provide a Hardware ID.");
    console.log("Usage: node generate-license.js <HWID> [days]");
    process.exit(1);
  }

  const validDays = days ? parseInt(days) : 365; // default 1 year
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + validDays);

  const payload = JSON.stringify({
    hwid,
    expiryDate: expiryDate.toISOString()
  });

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', normalizedSecret, iv);
  
  let encrypted = cipher.update(payload);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  const licenseKey = iv.toString('base64') + ':' + encrypted.toString('base64');
  
  console.log("\n========================================");
  console.log("          LICENSE GENERATED             ");
  console.log("========================================");
  console.log(`Hardware ID : ${hwid}`);
  console.log(`Valid for   : ${validDays} days`);
  console.log(`Expiry Date : ${expiryDate.toLocaleString()}`);
  console.log("\nLicense Key (Copy exactly as below):");
  console.log("----------------------------------------");
  console.log(licenseKey);
  console.log("----------------------------------------\n");
}

const args = process.argv.slice(2);
generateLicense(args[0], args[1]);
