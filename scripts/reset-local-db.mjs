/**
 * Clears the local D1 database so the next migration run starts from scratch.
 *
 * Wrangler keeps local D1 state in .wrangler/state/v3/d1 — that is the database
 * `wrangler dev` actually serves, so this is what needs clearing for a reset.
 *
 * Usage: node scripts/reset-local-db.mjs
 */
import { rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localD1Dir = resolve(root, '.wrangler/state/v3/d1');

rmSync(localD1Dir, { recursive: true, force: true });
console.log(`Cleared local D1 state: ${localD1Dir}`);
