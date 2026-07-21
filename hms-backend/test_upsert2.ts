import prisma from './src/prisma';

async function main() {
  try {
    await prisma.setting.upsert({
      where: { key: 'testKey' },
      update: { category: 'general', value: JSON.stringify('Test String') },
      create: { key: 'testKey', category: 'general', value: JSON.stringify('Test String') }
    });
    console.log("Upsert succeeded with stringify!");
  } catch (error) {
    console.error("Upsert failed:", error);
  }
}

main().finally(() => prisma.$disconnect());
