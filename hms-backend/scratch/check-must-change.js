const Database = require('better-sqlite3');
const db = new Database('C:/Users/Noor Ullah/AppData/Roaming/hotel-management-system/dev.db');
console.log(db.prepare('SELECT id, username, mustChangePassword FROM "User"').all());
