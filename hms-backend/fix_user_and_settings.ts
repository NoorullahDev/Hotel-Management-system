import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcrypt';

const adapter = new PrismaBetterSqlite3({
  url: 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Create Noorullah1245 user
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
  if (adminRole) {
    const passwordHash = await bcrypt.hash('noor11', 10);
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email: 'Noorullah1245' }, { name: 'Noorullah1245' }] } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email: 'noorullah1245@gmail.com', // Just an email
          name: 'Noorullah1245',
          passwordHash,
          roleId: adminRole.id
        }
      });
      console.log('User Noorullah1245 created.');
    } else {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null }
      });
      console.log('User Noorullah1245 updated.');
    }
  }

  // 2. Set Hotel Logo and Banner
  await prisma.setting.upsert({
    where: { key: 'hotelLogo' },
    update: { value: '"/uploads/1784286232146-WhatsApp_Image_2026-07-17_at_4.03.28_AM.jpeg"' },
    create: { key: 'hotelLogo', category: 'general', value: '"/uploads/1784286232146-WhatsApp_Image_2026-07-17_at_4.03.28_AM.jpeg"' }
  });

  await prisma.setting.upsert({
    where: { key: 'hotelBanner' },
    update: { value: '"/uploads/1784286119560-WhatsApp_Image_2026-07-17_at_4.01.17_AM.jpeg"' },
    create: { key: 'hotelBanner', category: 'general', value: '"/uploads/1784286119560-WhatsApp_Image_2026-07-17_at_4.01.17_AM.jpeg"' }
  });

  console.log('Settings restored.');
}

main().finally(() => prisma.$disconnect());
