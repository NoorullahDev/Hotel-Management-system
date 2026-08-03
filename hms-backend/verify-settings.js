const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  db.all("SELECT key, category, value FROM Setting WHERE key IN ('hotelLogo','hotelBanner','hotelName')", [], (err, rows) => {
    console.log('=== Current branding settings ===');
    if (err) { console.error(err); } else { rows.forEach(r => console.log(r.key, ':', JSON.stringify(r.value))); }
  });
  
  // Verify the noor user password change
  db.all("SELECT email, mustChangePassword FROM User WHERE email = 'noor'", [], (err, rows) => {
    console.log('\n=== noor user ===');
    if (err) { console.error(err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });
});

db.close(() => console.log('Done.'));
