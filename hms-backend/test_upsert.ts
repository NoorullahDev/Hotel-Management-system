import prisma from './src/prisma';

async function main() {
  try {
    await prisma.setting.upsert({
      where: { key: 'testKey' },
      update: { category: 'general', value: 'Test String' },
      create: { key: 'testKey', category: 'general', value: 'Test String' }
    });
    console.log("Upsert succeeded!");
  } catch (error) {
    console.error("Upsert failed:", error);
  }
}

main().finally(() => prisma.$disconnect());
