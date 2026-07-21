const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Connected to DB. Running migrations...');
    
    // Add Guest columns
    await client.query(`
      ALTER TABLE "Guest" 
      ADD COLUMN IF NOT EXISTS "guestType" TEXT NOT NULL DEFAULT 'LOCAL',
      ADD COLUMN IF NOT EXISTS "city" TEXT,
      ADD COLUMN IF NOT EXISTS "country" TEXT;
    `);
    console.log('Guest table updated.');

    // Add Booking columns
    await client.query(`
      ALTER TABLE "Booking" 
      ADD COLUMN IF NOT EXISTS "bookingType" TEXT NOT NULL DEFAULT 'LOCAL',
      ADD COLUMN IF NOT EXISTS "additionalGuests" JSONB,
      ADD COLUMN IF NOT EXISTS "arrivalTime" TIMESTAMP(3);
    `);
    console.log('Booking table updated.');

    console.log('Migrations complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
