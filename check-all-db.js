const fs = require('fs');

const dbs = [
  'hms-backend/dev.db',
  'hms-backend/dev_initial.db',
  'hms-backend/prisma/dev.db',
  'hms-backend/src/dev.db'
];

for (const p of dbs) {
  try {
    const data = fs.readFileSync(p);
    const hasFarooq = data.includes('FAROOQ HOTEL');
    const hasGrand = data.includes('Grand Park Hotel');
    const hasUploads = data.includes('uploads/');
    const hasIcon = data.includes('icon.png');
    console.log(`${p}: Farooq=${hasFarooq}, Grand=${hasGrand}, Uploads=${hasUploads}, Icon=${hasIcon}`);
  } catch (e) {
    console.log(`${p}: Error ${e.message}`);
  }
}
