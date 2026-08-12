const { execSync } = require('child_process');
const fs = require('fs');

const buffer = execSync('git show af85870ed362228809055f623b0114483e64d876:hms-backend/prisma/dev.db', { encoding: 'buffer' });
fs.writeFileSync('../reset_dev.db', buffer);
console.log('Extracted to reset_dev.db');
