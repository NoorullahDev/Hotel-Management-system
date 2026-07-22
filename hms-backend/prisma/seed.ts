import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcrypt';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1. Hotel Settings
  await prisma.hotelSettings.create({
    data: {
      name: "Grand Park Hotel",
      taxRate: 0.10,
      currency: "PKR",
      defaultCheckIn: "14:00",
      defaultCheckOut: "11:00",
    }
  });

  // 2. Roles
  const roleNames = ['Admin', 'Manager', 'Receptionist', 'Housekeeping', 'Restaurant'];
  const roles = [];
  for (const name of roleNames) {
    const r = await prisma.role.create({ data: { name } });
    roles.push(r);
  }

  // 3. Admin User
  const adminRole = roles.find(r => r.name === 'Admin');
  const passwordHash = await bcrypt.hash('adminpassword123', 10);
  await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@grandparkhotel.com',
      passwordHash,
      name: 'Super Admin',
      roleId: adminRole!.id,
    }
  });

  // 4. Room Types & Rooms
  const roomTypesData = ['Single', 'Double', 'Deluxe', 'Suite'];
  const roomTypes = [];
  for (const name of roomTypesData) {
    const rt = await prisma.roomType.create({ data: { name } });
    roomTypes.push(rt);
  }

  const roomPrices = { Single: 100, Double: 150, Deluxe: 250, Suite: 500 };
  const rooms = [];
  let roomCounter = 101;
  for (let i = 0; i < 20; i++) {
    const typeIdx = i % 4;
    const rt = roomTypes[typeIdx];
    const floor = Math.floor(i / 10) + 1;
    let status = 'AVAILABLE';
    if (i === 1) status = 'OCCUPIED';
    if (i === 2) status = 'RESERVED';
    if (i === 3) status = 'CLEANING';
    if (i === 4) status = 'MAINTENANCE';

    const r = await prisma.room.create({
      data: {
        number: roomCounter.toString(),
        floor,
        roomTypeId: rt.id,
        price: roomPrices[rt.name as keyof typeof roomPrices],
        status: status as any,
        amenities: JSON.stringify(['Wi-Fi', 'TV', 'Air Conditioning'])
      }
    });
    rooms.push(r);
    roomCounter++;
    if (roomCounter % 100 > 10) roomCounter = (floor + 1) * 100 + 1;
  }

  // 5. Guests
  const guests = [
    { name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
    { name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321' },
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '5551234567' },
  ];
  const dbGuests = [];
  for (const g of guests) {
    const dbG = await prisma.guest.create({ data: g });
    dbGuests.push(dbG);
  }

  // 6. Bookings
  const today = new Date();
  today.setHours(14, 0, 0, 0);
  const tmrw = new Date(today);
  tmrw.setDate(today.getDate() + 1);
  tmrw.setHours(11, 0, 0, 0);

  const b1 = await prisma.booking.create({
    data: {
      guestId: dbGuests[0].id,
      roomId: rooms[0].id, // Available -> will be Reserved
      checkIn: today,
      checkOut: tmrw,
      guestCount: 1,
      status: 'CONFIRMED',
      subtotal: 100,
      tax: 10,
      total: 110
    }
  });

  const b2 = await prisma.booking.create({
    data: {
      guestId: dbGuests[1].id,
      roomId: rooms[1].id, // Occupied room
      checkIn: new Date(today.getTime() - 86400000), // yesterday
      checkOut: tmrw,
      guestCount: 2,
      status: 'CHECKED_IN',
      subtotal: 300,
      tax: 30,
      total: 330
    }
  });

  const b3 = await prisma.booking.create({
    data: {
      guestId: dbGuests[2].id,
      roomId: rooms[2].id, // Reserved room
      checkIn: new Date(today.getTime() + 86400000), // tomorrow
      checkOut: new Date(today.getTime() + 86400000 * 3),
      guestCount: 1,
      status: 'CONFIRMED',
      subtotal: 750,
      tax: 75,
      total: 825
    }
  });

  console.log('Seeding finished successfully');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
