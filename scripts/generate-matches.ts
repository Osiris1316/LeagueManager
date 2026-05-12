/**
 * Reads tier assignments for a season from the local D1 database
 * and generates a .sql file with round-robin matches.
 *
 * Usage: npx tsx scripts/generate-matches.ts [seasonId]
 *
 * Outputs: scripts/output/matches-season-{id}.sql
 * Then run that file with:
 *   npx wrangler d1 execute league-manager-db --local --file=scripts/output/matches-season-1.sql
 *   npx wrangler d1 execute league-manager-db --remote --file=scripts/output/matches-season-1.sql
 */

import { generateRoundRobin } from '../packages/core/src/league/round-robin.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Find the local D1 SQLite file ──
// Wrangler stores local D1 data in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/
// There's a single .sqlite file in there.

function findLocalDb(): string {
  const d1Dir = resolve(__dirname, '..', '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(d1Dir)) {
    console.error('Local D1 database not found. Have you run wrangler d1 execute --local yet?');
    process.exit(1);
  }
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'));
  if (files.length === 0) {
    console.error('No .sqlite file found in', d1Dir);
    process.exit(1);
  }
  return join(d1Dir, files[0]!);
}

// ── Main ──

async function main() {
  const seasonId = parseInt(process.argv[2] ?? '1', 10);
  if (isNaN(seasonId)) {
    console.error('Usage: npx tsx scripts/generate-matches.ts [seasonId]');
    process.exit(1);
  }

  // Dynamic import so the script fails gracefully if better-sqlite3 isn't available
  const Database = (await import('better-sqlite3')).default;
  const dbPath = findLocalDb();
  const db = new Database(dbPath, { readonly: true });

  console.log(`Reading tier assignments for season ${seasonId}...`);

  // Get season info
  const season = db.prepare('SELECT * FROM seasons WHERE id = ?').get(seasonId) as any;
  if (!season) {
    console.error(`Season ${seasonId} not found.`);
    process.exit(1);
  }

  // Get tier assignments grouped by tier
  const assignments = db.prepare(`
    SELECT ta.tier_id, ta.player_id, p.display_name
    FROM tier_assignments ta
    JOIN players p ON ta.player_id = p.id
    WHERE ta.season_id = ?
    ORDER BY ta.tier_id, p.display_name
  `).all(seasonId) as { tier_id: string; player_id: number; display_name: string }[];

  // Group by tier
  const tierGroups = new Map<string, { player_id: number; display_name: string }[]>();
  for (const a of assignments) {
    if (!tierGroups.has(a.tier_id)) tierGroups.set(a.tier_id, []);
    tierGroups.get(a.tier_id)!.push({ player_id: a.player_id, display_name: a.display_name });
  }

  db.close();

  // Generate SQL
  const lines: string[] = [
    `-- Auto-generated matches for Season ${seasonId}`,
    `-- Generated: ${new Date().toISOString()}`,
    ``,
  ];

  for (const [tierId, players] of tierGroups) {
    const playerIds = players.map(p => p.player_id);
    const rounds = generateRoundRobin(playerIds);

    lines.push(`-- ${tierId}: ${players.map(p => p.display_name).join(', ')}`);
    lines.push(`DELETE FROM matches WHERE season_id = ${seasonId} AND tier_id = '${tierId}' AND status = 'pending';`);
    lines.push(``);

    for (const round of rounds) {
      const byePlayer = round.bye_player_id
        ? players.find(p => p.player_id === round.bye_player_id)?.display_name
        : null;

      lines.push(`-- Round ${round.round_number}${byePlayer ? ` (bye: ${byePlayer})` : ''}`);

      for (const pairing of round.pairings) {
        lines.push(
          `INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) ` +
          `VALUES (${seasonId}, '${tierId}', ${pairing.player1_id}, ${pairing.player2_id}, ${season.best_of}, ${round.round_number});`
        );
      }
    }
    lines.push(``);
  }

  // Write output
  const outDir = resolve(__dirname, 'output');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `matches-season-${seasonId}.sql`);
  writeFileSync(outPath, lines.join('\n'), 'utf-8');

  console.log(`\nGenerated: ${outPath}`);
  console.log(`\nRoster:`);
  for (const [tierId, players] of tierGroups) {
    console.log(`  ${tierId}: ${players.map(p => p.display_name).join(', ')}`);
  }
  console.log(`\nNext steps:`);
  console.log(`  1. Review the file: code ${outPath}`);
  console.log(`  2. Apply locally:  npx wrangler d1 execute league-manager-db --local --file=${outPath}`);
  console.log(`  3. Apply remotely: npx wrangler d1 execute league-manager-db --remote --file=${outPath}`);
}

main();