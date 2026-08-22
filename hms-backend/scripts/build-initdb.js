/**
 * Generates prisma/init.db — the clean, schema-only SQLite database shipped
 * with packaged builds. The Electron main process copies it to the user's
 * AppData on first launch (see hms-desktop/main.js); the backend then seeds
 * default roles/menu categories and the first admin account itself.
 *
 * Schema is applied from prisma/migrations via `prisma migrate deploy`, so
 * init.db always matches the checked-in migrations exactly and contains no
 * development data.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const initDb = path.join(__dirname, '..', 'prisma', 'init.db');

for (const suffix of ['', '-wal', '-shm']) {
  try { fs.rmSync(initDb + suffix, { force: true }); } catch { /* ignore */ }
}

const url = 'file:' + initDb.replace(/\\/g, '/');
execSync('npx prisma migrate deploy', {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, DATABASE_URL: url },
});

if (!fs.existsSync(initDb)) {
  console.error('build-initdb: init.db was not created at ' + initDb);
  process.exit(1);
}
console.log('build-initdb: created ' + initDb);
