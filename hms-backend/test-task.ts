import prisma from './src/prisma';

async function test() {
  try {
    const task = await prisma.housekeepingTask.create({
      data: {
        roomId: null,
        area: 'Bathroom',
        staffId: null,
        priority: 'Medium',
        taskType: 'Bathroom',
        estimatedTime: 30,
        scheduledDate: null,
        notes: null,
        status: 'PENDING',
      },
      include: { room: true }
    });
    console.log('Task created:', task);
  } catch (e) {
    console.error('Error:', e);
  }
}
test();
