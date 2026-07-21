import prisma from '../src/prisma';

async function main() {
  console.log('Seeding Housekeeping Tasks...');

  // Get all rooms
  const rooms = await prisma.room.findMany();
  
  // Get all staff
  let staffList = await prisma.staff.findMany({ include: { user: true } });

  // If no staff, create some
  if (staffList.length === 0) {
    console.log('No staff found. Creating mock staff...');
    const role = await prisma.role.findFirst({ where: { name: 'Staff' } }) || await prisma.role.create({ data: { name: 'Staff' } });
    
    const users = [
      { email: 'maria@hotel.com', name: 'Maria Garcia', phone: '123456789' },
      { email: 'john@hotel.com', name: 'John Smith', phone: '123456789' },
      { email: 'priya@hotel.com', name: 'Priya Sharma', phone: '123456789' },
      { email: 'james@hotel.com', name: 'James Wilson', phone: '123456789' }
    ];

    for (const u of users) {
      const user = await prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: {
          email: u.email,
          name: u.name,
          phone: u.phone,
          passwordHash: 'hashed',
          roleId: role.id
        }
      });
      await prisma.staff.create({
        data: {
          userId: user.id,
          department: 'Housekeeping',
          hireDate: new Date(),
          status: 'ACTIVE'
        }
      });
    }
    staffList = await prisma.staff.findMany({ include: { user: true } });
  }

  if (rooms.length === 0) {
    console.log('No rooms found. Cannot seed tasks.');
    return;
  }

  // Clear existing tasks
  await prisma.housekeepingTask.deleteMany();

  // Create tasks according to Kanban board logic
  const statuses = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'INSPECTED'];
  const priorities = ['High', 'Medium', 'Low'];

  let count = 0;
  for (let i = 0; i < Math.min(rooms.length, 20); i++) {
    const room = rooms[i];
    const staff = staffList[i % staffList.length];
    
    const status = statuses[i % statuses.length];
    const priority = priorities[i % priorities.length];

    const startedAt = status !== 'ASSIGNED' ? new Date(Date.now() - 30 * 60000) : null;
    const completedAt = (status === 'COMPLETED' || status === 'INSPECTED') ? new Date(Date.now() - 10 * 60000) : null;
    const inspectedAt = status === 'INSPECTED' ? new Date() : null;

    await prisma.housekeepingTask.create({
      data: {
        roomId: room.id,
        staffId: staff.id,
        status: status,
        priority: priority,
        taskType: 'Cleaning',
        estimatedTime: 30 + (i % 3) * 10,
        startedAt,
        completedAt,
        inspectedAt
      }
    });
    count++;
  }

  console.log(`Seeded ${count} Housekeeping Tasks successfully!`);
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
