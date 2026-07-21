import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// The file needs to run with ts-node which we have in the backend package.json
import { fileURLToPath } from 'url';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('Connected!');

    // Get __dirname equivalent for ES modules just in case, but tsconfig is commonjs so __dirname works
    const migrationPath = path.join(__dirname, 'prisma/migrations/20260705135346_init/migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    // Split by semicolons and run one by one to avoid large transaction limits
    // But actually, PG client handles multiple statements fine
    await client.query(sql);
    console.log('Migration applied successfully!');
    client.release();
    
    // Mark as applied
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMP WITH TIME ZONE,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMP WITH TIME ZONE,
        "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY ("id")
      );
    `);
    await pool.query(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
      VALUES ('1', 'manual', CURRENT_TIMESTAMP, '20260705135346_init', 1)
      ON CONFLICT DO NOTHING;
    `);
    
  } catch (err) {
    console.error('Error applying migration:', err);
  } finally {
    await pool.end();
  }
}

main();
