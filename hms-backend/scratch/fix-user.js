const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('C:/Users/Noor Ullah/AppData/Roaming/hotel-management-system/dev.db');

async function fixUser() {
  const hash = await bcrypt.hash('adminpassword123', 10);
  db.prepare('UPDATE "User" SET "passwordHash" = ?, "mustChangePassword" = 0').run(hash);
  console.log('Fixed password and mustChangePassword in AppData DB!');
}

fixUser();
