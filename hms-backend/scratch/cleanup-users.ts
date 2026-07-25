import prisma from '../src/prisma';

async function main() {
  const usersToDelete = ['hkstaff', 'rectest'];

  for (const username of usersToDelete) {
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        staff: {
          include: { housekeepingTasks: true }
        },
        auditLogs: true,
        notifications: true,
        notificationPreference: true
      }
    });

    if (user) {
      console.log(`\nFound user: ${username}`);
      console.log(`- Staff record: ${user.staff ? 'Yes' : 'No'}`);
      console.log(`- Housekeeping Tasks: ${user.staff?.housekeepingTasks.length || 0}`);
      console.log(`- Audit Logs: ${user.auditLogs.length}`);
      console.log(`- Notifications: ${user.notifications.length}`);
      console.log(`- Notification Preferences: ${user.notificationPreference ? 'Yes' : 'No'}`);

      // Because of onDelete: Cascade in Prisma schema, deleting the user will automatically 
      // delete the staff, audit logs, notifications, preferences, and housekeeping tasks.
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`=> Deleted user '${username}' and all associated cascaded records.`);
    } else {
      console.log(`\nUser '${username}' not found.`);
    }
  }

  const remainingUsers = await prisma.user.findMany();
  console.log(`\nTotal Users remaining in DB: ${remainingUsers.length}`);
  remainingUsers.forEach(u => console.log(`- ${u.username}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
