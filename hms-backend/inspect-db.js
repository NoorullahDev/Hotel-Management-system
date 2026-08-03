const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  // Check users table
  db.all("SELECT id, email, name, phone FROM User LIMIT 10", [], (err, rows) => {
    console.log('=== Users ===');
    if (err) { console.error('Users error:', err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });

  // Check HotelSettings
  db.all("SELECT * FROM HotelSettings LIMIT 5", [], (err, rows) => {
    console.log('\n=== HotelSettings ===');
    if (err) { console.error('HotelSettings error:', err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });

  // Check Setting table for logo/banner
  db.all("SELECT key, category, value FROM Setting WHERE key IN ('hotelLogo','hotelBanner','hotelName') LIMIT 10", [], (err, rows) => {
    console.log('\n=== Settings (branding) ===');
    if (err) { console.error('Settings error:', err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });

  // Check License table
  db.all("SELECT id, hwid, status, activationDate, expiryDate, lastRenewed FROM License LIMIT 5", [], (err, rows) => {
    console.log('\n=== License ===');
    if (err) { console.error('License error:', err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });
});

db.close(() => { console.log('\nDone.'); });
