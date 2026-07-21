import prisma from './src/prisma';
async function main() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ email: u.email, hash: u.passwordHash, name: u.name })));
}
main().finally(() => prisma.$disconnect());
