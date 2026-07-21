import prisma from './src/prisma';

async function main() {
  const s = await prisma.setting.findUnique({ where: { key: 'testKey' } });
  console.log('Value is:', s?.value, 'Type is:', typeof s?.value);
}

main().finally(() => prisma.$disconnect());
