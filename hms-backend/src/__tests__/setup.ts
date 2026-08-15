// Point every test run at the gitignored local dev database (dev.local.db),
// never at the committed prisma/dev.db that ships with the installer.
// Set TEST_DATABASE_URL to override. dotenv won't overwrite an env var that
// is already defined, so this takes precedence over .env.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'file:./prisma/dev.local.db';
