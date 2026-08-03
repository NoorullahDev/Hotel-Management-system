import prisma from './src/prisma';

async function run() {
  const users = await prisma.user.findMany({ include: { role: true } });
  console.log(users.map(u => ({ username: u.username, role: u.role.name, permissions: typeof u.role.permissions })));
  await prisma.$disconnect();
}
run().catch(console.error);
