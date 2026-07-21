require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`SELECT status, count(*) FROM "Room" GROUP BY status`);
  console.log('Room statuses:', res.rows);

  const res2 = await pool.query(`SELECT "roomId", status, "checkIn", "checkOut" FROM "Booking"`);
  console.log('Bookings:', res2.rows);

  process.exit(0);
}

run().catch(console.error);
