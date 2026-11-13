/**
 * Writes the console statements that set up an event season: the season row,
 * its one-group roster, the round-robin group matches (circle method, from
 * core), the three draft buttons, the rules and the map pool.
 *
 * Every statement comes out with literal values and no comments, one per
 * block, ready to paste into the D1 console one at a time.
 *
 *   npx tsx scripts/event/generate-setup.ts scripts/event/my-event.json > setup.sql
 *
 * The JSON file:
 *   {
 *     "seasonId": 6,              // the id the season row will get (check first)
 *     "seasonNumber": 6,          // one above the highest season_number
 *     "name": "ACRS Invitational",
 *     "startedAt": "2026-11-14",
 *     "titleId": "aoe4",
 *     "tierId": "code_s",         // the container tier for the group
 *     "bestOf": 1,
 *     "players": [2, 5, 9, ...],  // player ids; order decides the round pairings
 *     "maps": [["dry-arabia", "Dry Arabia"], ...],
 *     "mapsHaveTitleId": true,    // maps table has a title_id column
 *     "buttons": [["map", "Map Draft"], ["civ_main", "XvX Civ Draft"], ["civ_game", "SvA Civ Draft"]],
 *     "rulesSummary": "...",
 *     "rulesFull": "markdown..."
 *   }
 */
import { readFileSync } from 'node:fs';
import { generateRoundRobin } from '../../packages/core/src/league/round-robin.js';

interface EventConfig {
  seasonId: number;
  seasonNumber: number;
  name: string;
  startedAt: string;
  titleId: string;
  tierId: string;
  bestOf: number;
  players: number[];
  maps: [string, string][];
  mapsHaveTitleId: boolean;
  buttons: [string, string][];
  rulesSummary: string;
  rulesFull: string;
}

const config = JSON.parse(readFileSync(process.argv[2]!, 'utf8')) as EventConfig;
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const e = config.seasonId;
const out: string[] = [];

out.push(
  `INSERT INTO seasons (season_number, title_id, season_index, format, name, status, best_of, started_at) VALUES (${config.seasonNumber}, ${q(config.titleId)}, NULL, 'tournament', ${q(config.name)}, 'pending', 3, ${q(config.startedAt)})`,
);
out.push(`SELECT id, season_number, name, format, status FROM seasons WHERE season_number = ${config.seasonNumber}`);

out.push(
  `INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES ${config.players
    .map((p) => `(${e}, ${p}, ${q(config.tierId)})`)
    .join(', ')}`,
);

const rounds = generateRoundRobin(config.players);
const rows = rounds.flatMap((r) =>
  r.pairings.map((p) => `(${e}, ${q(config.tierId)}, ${p.player1_id}, ${p.player2_id}, ${config.bestOf}, ${r.round_number})`),
);
out.push(
  `INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES ${rows.join(', ')}`,
);

out.push(
  `INSERT INTO season_tier_presets (season_id, tier_id, draft_type, preset_id, preset_url, label) VALUES ${config.buttons
    .map(([type, label]) => `(${e}, ${q(config.tierId)}, ${q(type)}, NULL, NULL, ${q(label)})`)
    .join(', ')}`,
);

out.push(
  `INSERT INTO season_tier_rules (season_id, tier_id, rules_summary, rules_full) VALUES (${e}, ${q(config.tierId)}, ${q(config.rulesSummary)}, ${q(config.rulesFull)})`,
);

out.push(
  config.mapsHaveTitleId
    ? `INSERT OR IGNORE INTO maps (id, name, title_id) VALUES ${config.maps.map(([id, name]) => `(${q(id)}, ${q(name)}, ${q(config.titleId)})`).join(', ')}`
    : `INSERT OR IGNORE INTO maps (id, name) VALUES ${config.maps.map(([id, name]) => `(${q(id)}, ${q(name)})`).join(', ')}`,
);
out.push(
  `INSERT INTO season_maps (season_id, map_id) VALUES ${config.maps.map(([id]) => `(${e}, ${q(id)})`).join(', ')}`,
);

process.stdout.write(out.map((s) => `${s};`).join('\n\n') + '\n');

// The schedule, for the handoff (stderr, so it never lands in the SQL file).
for (const r of rounds) {
  process.stderr.write(
    `Round ${r.round_number}: ${r.pairings.map((p) => `${p.player1_id} v ${p.player2_id}`).join(', ')}` +
      (r.bye_player_id !== undefined ? ` (sits out: ${r.bye_player_id})` : '') + '\n',
  );
}
