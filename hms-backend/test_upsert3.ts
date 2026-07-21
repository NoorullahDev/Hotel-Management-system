import prisma from './src/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  try {
    const val = 'Test String 3';
    await prisma.setting.upsert({
      where: { key: 'testKey3' },
      update: { category: 'general', value: val as Prisma.InputJsonValue },
      create: { key: 'testKey3', category: 'general', value: val as Prisma.InputJsonValue }
    });
    console.log("Upsert 3 succeeded!");
    const s = await prisma.setting.findUnique({ where: { key: 'testKey3' } });
    console.log('Value 3 is:', s?.value);
  } catch (error) {
    console.error("Upsert 3 failed:", error);
  }
}

main().finally(() => prisma.$disconnect());
