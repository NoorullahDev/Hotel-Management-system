const Database = require('better-sqlite3');
const db = new Database('C:/Users/Noor Ullah/AppData/Roaming/hotel-management-system/dev.db');

db.prepare('UPDATE "User" SET "mustChangePassword" = 0').run();
console.log('Successfully updated mustChangePassword to 0 for existing users.');
