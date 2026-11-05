import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { z } from 'zod';

export const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../migrations');

/** Applies all pending migrations using the given (owner) connection string. */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

/**
 * Executed by a one-shot container BEFORE the API starts, using a separate
 * owner role (MIGRATION_DATABASE_URL); the API itself runs with a
 * least-privilege role and cannot alter schema.
 */
async function main(): Promise<void> {
  const url = z.string().url().parse(process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL);
  await runMigrations(url);
  console.log('Migrations applied.');
}

// Run only when executed directly (`node migrate.js`), not when imported by tests.
if (typeof require !== 'undefined' && require.main === module) {
  main().catch((err: unknown) => {
    console.error('Migration failed:', err instanceof Error ? err.message : 'unknown error');
    process.exit(1);
  });
}
