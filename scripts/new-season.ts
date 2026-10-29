/**
 * Creates a new season from an existing one.
 *
 * Rolls the league forward in a single transaction:
 *   - closes the source season, opens the new one
 *   - carries the roster over, applying any promotions / relegations
 *   - copies the per-season rules and draft presets
 *   - regenerates the round-robin bracket for each tier
 *   - records every roster change in season_transitions
 *
 * Writes straight to the local D1 database (the one `wrangler dev` serves)
 * and also emits an equivalent .sql file so the same change can be applied
 * to the remote database.
 *
 * Usage:
 *   npx tsx scripts/new-season.ts [options]
 *
 *   --from <seasonId>        Source season (default: the active one)
 *   --number <n>             New season number (default: source + 1)
 *   --best-of <3|5>          Best-of for the new season (default: source's)
 *   --notes "<text>"         Free-text notes for the season
 *   --promote <id>:<from>:<to>    Move a player up a tier (repeatable)
 *   --relegate <id>:<from>:<to>   Move a player down a tier (repeatable)
 *   --dry-run                Print the plan without writing anything
 *
 * Examples:
 *   npx tsx scripts/new-season.ts
 *   npx tsx scripts/new-season.ts --number 3 --best-of 5 --notes "Double elimination"
 *   npx tsx scripts/new-season.ts --promote 9:code_a:code_s --relegate 4:code_s:code_a
 */

import Database from 'better-sqlite3';
import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { generateRoundRobin } from '../packages/core/src/league/round-robin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const VALID_TIERS = ['code_s', 'code_a', 'code_b'];

// ── Argument parsing ──

interface Move {
  playerId: number;
  fromTier: string;
  toTier: string;
  type: 'promotion' | 'relegation';
}

interface Options {
  from?: number;
  number?: number;
  bestOf?: number;
  notes?: string;
  promotions: Move[];
  relegations: Move[];
  dryRun: boolean;
}

function parseMove(raw: string, type: Move['type']): Move {
  const parts = raw.split(':');
  if (parts.length !== 3) {
    throw new Error(`Invalid --${type} value "${raw}" — expected playerId:fromTier:toTier`);
  }
  const [idRaw, from, to] = parts as [string, string, string];
  const playerId = Number.parseInt(idRaw, 10);
  if (!Number.isFinite(playerId)) throw new Error(`Invalid player id in "${raw}"`);
  for (const tier of [from, to]) {
    if (!VALID_TIERS.includes(tier)) {
      throw new Error(`Invalid tier "${tier}" in "${raw}" — expected one of ${VALID_TIERS.join(', ')}`);
    }
  }
  return { playerId, fromTier: from, toTier: to, type };
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { promotions: [], relegations: [], dryRun: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`Missing value for ${arg}`);
      return v;
    };

    switch (arg) {
      case '--from': opts.from = Number.parseInt(next(), 10); break;
      case '--number': opts.number = Number.parseInt(next(), 10); break;
      case '--best-of': opts.bestOf = Number.parseInt(next(), 10); break;
      case '--notes': opts.notes = next(); break;
      case '--promote': opts.promotions.push(parseMove(next(), 'promotion')); break;
      case '--relegate': opts.relegations.push(parseMove(next(), 'relegation')); break;
      case '--dry-run': opts.dryRun = true; break;
      case '--help':
      case '-h':
        console.log(readFileSync(fileURLToPath(import.meta.url), 'utf-8').split('*/')[0]!.replace(/^\/\*\*?/, '').replace(/^ \* ?/gm, ''));
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown option "${arg}"`);
    }
  }

  if (opts.bestOf !== undefined && ![3, 5].includes(opts.bestOf)) {
    throw new Error('--best-of must be 3 or 5');
  }
  return opts;
}

// ── Locate the local D1 database ──

function findLocalDb(): string {
  const d1Dir = resolve(ROOT, '.wrangler', 'state', 'v3', 'd1', 'miniflare-D1DatabaseObject');
  if (!existsSync(d1Dir)) {
    throw new Error(
      'Local D1 database not found. Run `pnpm migrate` first, then try again.'
    );
  }
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'));
  if (files.length === 0) {
    throw new Error(`No .sqlite file found in ${d1Dir}`);
  }
  return join(d1Dir, files[0]!);
}

// ── Main ──

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const dbPath = findLocalDb();
  const db = new Database(dbPath);

  try {
    // ── Source season ──
    let sourceId = opts.from;
    if (sourceId === undefined) {
      const active = db.prepare(`SELECT id FROM seasons WHERE status = 'active' ORDER BY season_number DESC LIMIT 1`).get() as { id: number } | undefined;
      const latest = db.prepare(`SELECT id FROM seasons ORDER BY season_number DESC LIMIT 1`).get() as { id: number } | undefined;
      const pick = active ?? latest;
      if (!pick) throw new Error('No seasons found in the database.');
      sourceId = pick.id;
    }

    const source = db.prepare('SELECT * FROM seasons WHERE id = ?').get(sourceId) as any;
    if (!source) throw new Error(`Season ${sourceId} not found.`);

    const newNumber = opts.number ?? source.season_number + 1;
    const bestOf = opts.bestOf ?? source.best_of;
    const notes = opts.notes ?? `Season ${newNumber}.`;

    const existing = db.prepare('SELECT id FROM seasons WHERE season_number = ?').get(newNumber) as { id: number } | undefined;
    if (existing) {
      throw new Error(`Season ${newNumber} already exists (id=${existing.id}). Use --number to pick another.`);
    }

    // ── Roster ──
    const roster = db.prepare(`
      SELECT ta.player_id, ta.tier_id, p.display_name
      FROM tier_assignments ta
      JOIN players p ON ta.player_id = p.id
      WHERE ta.season_id = ?
      ORDER BY ta.tier_id, p.display_name
    `).all(sourceId) as { player_id: number; tier_id: string; display_name: string }[];

    if (roster.length === 0) {
      throw new Error(`Season ${source.id} has no tier assignments — nothing to carry over.`);
    }

    const tierByPlayer = new Map<number, string>(roster.map(r => [r.player_id, r.tier_id]));
    // Tier each player is in today, kept so transitions can record where
    // they came from as well as where they ended up.
    const originalTierByPlayer = new Map(tierByPlayer);

    // ── Validate moves ──
    const allMoves = [...opts.promotions, ...opts.relegations];
    const seen = new Set<number>();
    for (const mv of allMoves) {
      if (seen.has(mv.playerId)) {
        throw new Error(`Player ${mv.playerId} has more than one move in this command.`);
      }
      seen.add(mv.playerId);

      const current = tierByPlayer.get(mv.playerId);
      if (current === undefined) {
        throw new Error(`Player ${mv.playerId} is not in the season ${sourceId} roster.`);
      }
      if (current !== mv.fromTier) {
        throw new Error(
          `Player ${mv.playerId} is in ${current}, not ${mv.fromTier} (as given in --${mv.type}).`
        );
      }
      if (mv.fromTier === mv.toTier) {
        throw new Error(`Move for player ${mv.playerId} does not change tier.`);
      }
      tierByPlayer.set(mv.playerId, mv.toTier);
    }

    // ── Plan the new roster ──
    const newRoster = roster.map(r => ({
      player_id: r.player_id,
      display_name: r.display_name,
      tier_id: tierByPlayer.get(r.player_id)!,
    }));

    const byTier = new Map<string, typeof newRoster>();
    for (const p of newRoster) {
      if (!byTier.has(p.tier_id)) byTier.set(p.tier_id, []);
      byTier.get(p.tier_id)!.push(p);
    }

    console.log(`\nCreating Season ${newNumber} (best of ${bestOf}) from Season ${source.season_number}\n`);
    console.log('Roster:');
    for (const tier of VALID_TIERS) {
      const members = byTier.get(tier) ?? [];
      const moved = members.filter(m => originalTierByPlayer.get(m.player_id) !== m.tier_id);
      console.log(`  ${tier}: ${members.map(m => m.display_name).join(', ') || '(empty)'}`);
      if (moved.length) {
        console.log(`     moved in: ${moved.map(m => `${m.display_name} → ${m.tier_id}`).join(', ')}`);
      }
      if (members.length < 2) {
        console.warn(`     WARNING: ${tier} has ${members.length} player(s) — no matches will be generated.`);
      }
    }

    if (allMoves.length === 0) {
      console.log('\nNo promotions or relegations given — every player stays in their tier.');
    }

    // ── Generate the bracket ──
    const roundsByTier = new Map<string, ReturnType<typeof generateRoundRobin>>();
    let totalMatches = 0;
    for (const [tier, members] of byTier) {
      const rounds = generateRoundRobin(members.map(m => m.player_id));
      roundsByTier.set(tier, rounds);
      totalMatches += rounds.reduce((n, r) => n + r.pairings.length, 0);
    }
    console.log(`\nBracket: ${totalMatches} matches across ${byTier.size} tier(s).`);

    if (opts.dryRun) {
      console.log('\n--dry-run: nothing was written.');
      return;
    }

    // ── Write, atomically ──
    const apply = db.transaction(() => {
      const newSeasonId = Number(
        db.prepare(`INSERT INTO seasons (season_number, status, best_of, started_at, notes)
                    VALUES (?, 'active', ?, datetime('now'), ?)`)
          .run(newNumber, bestOf, notes).lastInsertRowid
      );

      db.prepare(`UPDATE seasons SET status = 'complete', completed_at = datetime('now') WHERE id = ?`)
        .run(sourceId);

      const insertAssignment = db.prepare(
        `INSERT INTO tier_assignments (season_id, player_id, tier_id, promoted, relegated)
         VALUES (?, ?, ?, ?, ?)`
      );
      const insertTransition = db.prepare(
        `INSERT INTO season_transitions (from_season_id, to_season_id, player_id, from_tier_id, to_tier_id, transition_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const p of newRoster) {
        const move = allMoves.find(m => m.playerId === p.player_id);
        const fromTier = originalTierByPlayer.get(p.player_id)!;
        const moved = fromTier !== p.tier_id;
        insertAssignment.run(
          newSeasonId,
          p.player_id,
          p.tier_id,
          move?.type === 'promotion' ? 1 : 0,
          move?.type === 'relegation' ? 1 : 0
        );
        insertTransition.run(
          sourceId,
          newSeasonId,
          p.player_id,
          fromTier,
          p.tier_id,
          moved ? move!.type : 'static'
        );
      }

      db.prepare(`INSERT INTO season_tier_rules (season_id, tier_id, rules_summary, rules_full)
                  SELECT ?, tier_id, rules_summary, rules_full FROM season_tier_rules WHERE season_id = ?`)
        .run(newSeasonId, sourceId);

      db.prepare(`INSERT INTO season_tier_presets (season_id, tier_id, draft_type, preset_id, preset_url, label)
                  SELECT ?, tier_id, draft_type, preset_id, preset_url, label FROM season_tier_presets WHERE season_id = ?`)
        .run(newSeasonId, sourceId);

      const insertMatch = db.prepare(
        `INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number)
         VALUES (?, ?, ?, ?, ?, ?)`
      );
      for (const [tier, rounds] of roundsByTier) {
        for (const round of rounds) {
          for (const p of round.pairings) {
            insertMatch.run(newSeasonId, tier, p.player1_id, p.player2_id, bestOf, round.round_number);
          }
        }
      }

      return newSeasonId;
    });

    const newSeasonId = apply();

    // ── Emit the same change as SQL, for the remote database ──
    const outDir = resolve(ROOT, 'scripts', 'output');
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, `new-season-${newNumber}.sql`);
    const sql: string[] = [
      `-- Season ${newNumber}, created from season ${source.season_number}`,
      `-- Generated: ${new Date().toISOString()}`,
      `-- Apply with: npx wrangler d1 execute league-manager-db --remote --file=${outPath}`,
      '',
      `UPDATE seasons SET status = 'complete', completed_at = datetime('now') WHERE id = ${sourceId};`,
      `INSERT INTO seasons (season_number, status, best_of, started_at, notes) VALUES (${newNumber}, 'active', ${bestOf}, datetime('now'), '${notes.replace(/'/g, "''")}');`,
      '',
    ];
    for (const p of newRoster) {
      const move = allMoves.find(m => m.playerId === p.player_id);
      sql.push(
        `INSERT INTO tier_assignments (season_id, player_id, tier_id, promoted, relegated) ` +
        `VALUES (${newSeasonId}, ${p.player_id}, '${p.tier_id}', ${move?.type === 'promotion' ? 1 : 0}, ${move?.type === 'relegation' ? 1 : 0});`
      );
    }
    sql.push('');
    for (const [tier, rounds] of roundsByTier) {
      for (const round of rounds) {
        for (const p of round.pairings) {
          sql.push(
            `INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) ` +
            `VALUES (${newSeasonId}, '${tier}', ${p.player1_id}, ${p.player2_id}, ${bestOf}, ${round.round_number});`
          );
        }
      }
    }
    writeFileSync(outPath, sql.join('\n'), 'utf-8');

    console.log(`\nSeason ${newNumber} created (id=${newSeasonId}). Season ${source.season_number} is now complete.`);
    console.log(`Remote SQL written to: ${outPath}`);
    console.log(`  Apply it with: npx wrangler d1 execute league-manager-db --remote --file=${outPath}`);
  } finally {
    db.close();
  }
}

try {
  main();
} catch (err) {
  console.error(`\nError: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
