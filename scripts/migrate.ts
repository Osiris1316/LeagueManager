/**
 * Migration runner for local development.
 * Reads .sql files from packages/core/src/db/migrations/ in order,
 * tracks applied migrations in the _migrations table, and runs new ones.
 *
 * Usage: npx tsx scripts/migrate.ts
 */

/**
 * Migration runner for local development.
 * Reads .sql files from packages/core/src/db/migrations/ in order,
 * tracks applied migrations in the _migrations table, and runs new ones.
 *
 * Usage: npx tsx scripts/migrate.ts
 */

import Database from 'better-sqlite3';
import { mkdirSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = resolve(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = resolve(DATA_DIR, 'local.db');

const MIGRATIONS_DIR = resolve(
  __dirname,
  '..',
  'packages',
  'core',
  'src',
  'db',
  'migrations'
);

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Ensure _migrations table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    filename  TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Get already-applied migrations
const applied = new Set(
  db
    .prepare('SELECT filename FROM _migrations')
    .all()
    .map((row: any) => row.filename as string)
);

// Read migration files and sort numerically
const files = readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`  skip: ${file} (already applied)`);
    continue;
  }

  const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
  console.log(`  apply: ${file}`);

  // Run migration in a transaction
  db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file);
  })();

  count++;
}

db.close();

if (count === 0) {
  console.log('\nAll migrations already applied.');
} else {
  console.log(`\nApplied ${count} migration(s). Database: ${DB_PATH}`);
}
