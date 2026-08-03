const { execSync } = require('child_process');
const fs = require('fs');

const commits = execSync('git log --oneline -n 50').toString().split('\n').filter(Boolean);

for (const line of commits) {
  const hash = line.split(' ')[0];
  try {
    const db = execSync(`git show ${hash}:hms-backend/prisma/dev.db`, { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
    const hasFarooq = db.includes('FAROOQ HOTEL');
    const hasGrand = db.includes('Grand Park Hotel');
    const hasUploads = db.includes('uploads/image');
    console.log(`${hash}: Farooq=${hasFarooq}, Grand=${hasGrand}, Uploads=${hasUploads}, msg=${line.substring(8)}`);
  } catch (e) {
    console.log(`${hash}: error or no dev.db`);
  }
}
