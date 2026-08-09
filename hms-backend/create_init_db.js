const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const devDbPath = path.join(__dirname, 'prisma', 'dev.db');
const initDbPath = path.join(__dirname, 'prisma', 'init.db');

if (fs.existsSync(initDbPath)) fs.unlinkSync(initDbPath);
fs.copyFileSync(devDbPath, initDbPath);

const db = new Database(initDbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_prisma_migrations'").all();

db.exec('PRAGMA foreign_keys = OFF;');
for (const table of tables) {
    db.prepare(`DELETE FROM "${table.name}"`).run();
}
db.exec('PRAGMA foreign_keys = ON;');

db.close();
console.log('init.db created and cleared successfully!');
