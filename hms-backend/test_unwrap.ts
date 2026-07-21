import prisma from './src/prisma';

async function main() {
  const s = await prisma.setting.findUnique({ where: { key: 'testKey' } });
  console.log('Raw:', s?.value);
  console.log('Parsed:', typeof s?.value === 'string' ? JSON.parse(s.value) : s?.value);
}

main().finally(() => prisma.$disconnect());
