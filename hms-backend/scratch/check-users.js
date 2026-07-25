const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');

const users = db.prepare("SELECT * FROM User").all();
console.log("Users in DB:");
console.log(users);
