const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const db = new Database('C:/Users/Noor Ullah/AppData/Roaming/hotel-management-system/dev.db');

async function resetPassword() {
  const hash = await bcrypt.hash('adminpassword123', 10);
  db.prepare('UPDATE "User" SET "passwordHash" = ? WHERE "username" = ?').run(hash, 'noorullah1245');
  console.log('Password reset successfully!');
}

resetPassword();
