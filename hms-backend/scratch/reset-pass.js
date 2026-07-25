const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

const db = new Database('prisma/dev.db');

const hash = bcrypt.hashSync('adminpassword123', 10);
const stmt = db.prepare('UPDATE User SET passwordHash = ? WHERE username = ?');
const info = stmt.run(hash, 'admin');

console.log('Password updated for admin:', info.changes > 0 ? 'Success' : 'Failed');
