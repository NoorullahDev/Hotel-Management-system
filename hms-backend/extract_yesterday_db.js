const { execSync } = require('child_process');
const fs = require('fs');

const buffer = execSync('git show 3a4573fec85747556d25eacf2b40b60a3b11050d:hms-backend/prisma/dev.db', { encoding: 'buffer' });
fs.writeFileSync('../yesterday_dev.db', buffer);
console.log('Extracted to yesterday_dev.db');
