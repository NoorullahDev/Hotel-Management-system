const { execSync } = require('child_process');
const fs = require('fs');

const buffer = execSync('git show 0ab258ddd3c67d80e11b3be3fdccc1ffdf128353:hms-backend/prisma/dev.db', { encoding: 'buffer' });
fs.writeFileSync('../init_dev.db', buffer);
console.log('Extracted to init_dev.db');
