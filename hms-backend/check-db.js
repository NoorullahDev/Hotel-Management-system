const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db');

console.log("Tables:");
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables.map(t => t.name));

console.log("\nUser columns:");
const userCols = db.prepare("PRAGMA table_info(User)").all();
console.log(userCols.map(c => c.name));

console.log("\nInvoice columns:");
const invCols = db.prepare("PRAGMA table_info(Invoice)").all();
console.log(invCols.map(c => c.name));
