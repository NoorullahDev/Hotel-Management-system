const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./prisma/dev.db');

db.serialize(() => {
  db.run("UPDATE HotelSettings SET loginBackgroundImage = '/uploads/background.jpg', name = 'Farooq Hotel'");
  
  db.run("INSERT OR REPLACE INTO Setting (key, category, value) VALUES ('hotelLogo', 'branding', '\"/uploads/logo.jpg\"')");
  
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 2);
  const expiryIso = expiry.toISOString();
  db.run("UPDATE License SET expiryDate = ?, status = 'Active'", [expiryIso]);
  
  console.log('Updated SQLite directly.');
});

db.close();
