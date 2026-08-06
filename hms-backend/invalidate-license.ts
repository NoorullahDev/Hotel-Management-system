import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import os from 'os';

// Path to AppData dev.db
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'hotel-management-system', 'dev.db');

const adapter = new PrismaBetterSqlite3({
  url: `file:${dbPath}`
});

const prisma = new PrismaClient({ adapter });

async function invalidate() {
  const license = await prisma.license.findFirst();
  if (license) {
    await prisma.license.update({
      where: { id: license.id },
      data: { status: 'Expired', expiryDate: new Date(Date.now() - 100000) }
    });
    console.log('License invalidated in AppData.');
  } else {
    console.log('No license found in AppData.');
  }
}
invalidate().finally(() => prisma.$disconnect());
