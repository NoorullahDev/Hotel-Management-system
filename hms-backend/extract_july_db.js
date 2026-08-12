const { execSync } = require('child_process');
const fs = require('fs');

// Extract from commit before "Clean up stray test users from seeded database"
// which is 8cc1763c534f05d2340ceba8f16566b46c28445e
const buffer = execSync('git show 8cc1763c534f05d2340ceba8f16566b46c28445e~1:hms-backend/prisma/dev.db', { encoding: 'buffer' });
fs.writeFileSync('../july_dev.db', buffer);
console.log('Extracted to july_dev.db');
