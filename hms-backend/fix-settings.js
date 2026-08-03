const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  // Check user noor's password hash and role
  db.all("SELECT u.id, u.email, u.name, u.passwordHash, u.mustChangePassword, r.name as roleName FROM User u LEFT JOIN Role r ON u.roleId = r.id WHERE u.email = 'noor' OR u.email LIKE '%noor%' LIMIT 5", [], (err, rows) => {
    console.log('=== User noor ===');
    if (err) { console.error('Error:', err); } else { console.log(JSON.stringify(rows, null, 2)); }
  });

  // Fix hotelBanner to use the real hotel building background
  // Fix hotelLogo to use the swoosh logo
  // Fix hotelName 
  db.run("UPDATE Setting SET value = '\"/uploads/hotel_bg.png\"', category = 'general' WHERE key = 'hotelBanner'", (err) => {
    if (err) { console.error('hotelBanner update error:', err); } else { console.log('hotelBanner updated.'); }
  });

  db.run("UPDATE Setting SET value = '\"/uploads/swoosh_logo.png\"' WHERE key = 'hotelLogo'", (err) => {
    if (err) { console.error('hotelLogo update error:', err); } else { console.log('hotelLogo updated.'); }
  });
  
  db.run("UPDATE Setting SET value = '\"Farooq Hotel\"' WHERE key = 'hotelName'", (err) => {
    if (err) { console.error('hotelName update error:', err); } else { console.log('hotelName updated.'); }
  });
  
  // Also fix HotelSettings name and loginBackgroundImage to use real hotel bg
  db.run("UPDATE HotelSettings SET name = 'Farooq Hotel', loginBackgroundImage = '/uploads/hotel_bg.png'", (err) => {
    if (err) { console.error('HotelSettings update error:', err); } else { console.log('HotelSettings updated.'); }
  });
});

db.close(() => { console.log('Done.'); });
