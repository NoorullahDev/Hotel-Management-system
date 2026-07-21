const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const types = await prisma.roomType.findMany();
    if (types.length === 0) { console.log('No room types'); return; }
    
    const res = await prisma.room.create({
      data: {
        number: '145_TEST',
        floor: parseInt('1'),
        roomTypeId: types[0].id,
        price: 1234,
        amenities: ['wifi'],
        imageUrl: 'http://localhost:4000/uploads/test.jpg',
        status: 'AVAILABLE'
      }
    });
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
