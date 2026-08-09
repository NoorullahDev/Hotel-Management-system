const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'hotel-management-system', 'dev.db');
console.log('Using DB:', dbPath);

const db = new Database(dbPath);

try {
  const bookings = db.prepare('SELECT * FROM Booking').all();
  const rooms = db.prepare('SELECT * FROM Room').all();
  const foodOrders = db.prepare('SELECT * FROM FoodOrder').all();
  const serviceOrders = db.prepare('SELECT * FROM ServiceOrder').all();
  
  for (const b of bookings) {
    if (b.roomRate == null) {
      console.log(`Booking ${b.id} has no roomRate. DB Total = ${b.total}`);
      
      const bFood = foodOrders.filter(o => o.bookingId === b.id);
      const bService = serviceOrders.filter(o => o.bookingId === b.id);
      
      let foodTotal = bFood.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      let serviceTotal = bService.reduce((sum, o) => sum + Number(o.totalAmount), 0);
      
      const checkIn = new Date(b.checkIn);
      const checkOut = new Date(b.checkOut);
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000));
      
      const room = rooms.find(r => r.id === b.roomId);
      
      // Assume tax = 0 for this calculation since tax = b.tax
      const expectedRoomTotal = Number(b.subtotal) - foodTotal - serviceTotal;
      let newRoomRate = expectedRoomTotal / nights;
      
      if (newRoomRate <= 0) {
        newRoomRate = Number(room.price);
      }
      
      db.prepare('UPDATE Booking SET roomRate = ? WHERE id = ?').run(newRoomRate, b.id);
      console.log(`=> Initialized booking ${b.id} roomRate to ${newRoomRate} to preserve historical totals.`);
    }
  }
} catch (e) {
  console.error(e);
} finally {
  db.close();
}
