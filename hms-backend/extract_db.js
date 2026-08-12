const { execSync } = require('child_process');
const fs = require('fs');

const buffer = execSync('git show af85870ed362228809055f623b0114483e64d876~1:hms-backend/prisma/dev.db', { encoding: 'buffer' });
fs.writeFileSync('../temp_dev2.db', buffer);
console.log('Extracted to temp_dev2.db');
