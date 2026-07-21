import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db.bak'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const settings = await prisma.setting.findMany();
  console.log('Settings:', settings);
  
  const hotelSettings = await prisma.hotelSettings.findMany();
  console.log('HotelSettings:', hotelSettings);

  const users = await prisma.user.findMany();
  console.log('Users:', users.map(u => ({ email: u.email, name: u.name })));
}

main().finally(() => prisma.$disconnect());
