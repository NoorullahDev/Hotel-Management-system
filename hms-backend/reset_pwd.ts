import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Noor123', 10);
  await prisma.user.updateMany({
    where: { email: 'Noorullah' },
    data: { 
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
  console.log('Password updated for Noorullah to Noor123 and account unlocked.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
