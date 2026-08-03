const fs = require('fs');
const db = fs.readFileSync('hms-backend/prisma/dev.db');
console.log('FAROOQ HOTEL:', db.includes('FAROOQ HOTEL'));
console.log('logo:', db.includes('logo'));
