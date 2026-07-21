import prisma from './src/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const adminRole = await prisma.role.findFirst({
    where: { name: 'Admin' }
  });

  if (!adminRole) {
    console.log('Admin role not found');
    return;
  }

  const adminUser = await prisma.user.findFirst({
    where: { roleId: adminRole.id }
  });

  if (!adminUser) {
    console.log('No admin user found');
    return;
  }

  const passwordHash = await bcrypt.hash('noor11', 10);

  const updatedUser = await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      email: 'Noorullah1122',
      name: 'Noorullah',
      passwordHash: passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });

  console.log('Successfully updated admin user:');
  console.log('Username (email field):', updatedUser.email);
  console.log('Name:', updatedUser.name);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
