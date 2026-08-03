const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

async function main() {
  const hash = await bcrypt.hash('noor11', 10);
  console.log('New hash for noor11:', hash);
  
  const db = new sqlite3.Database('./prisma/dev.db');
  db.run("UPDATE User SET passwordHash = ?, mustChangePassword = 0 WHERE email = 'noor'", [hash], function(err) {
    if (err) { console.error('Error:', err); }
    else { console.log('Password updated for noor. Rows changed:', this.changes); }
    db.close(() => console.log('Done.'));
  });
}

main();
