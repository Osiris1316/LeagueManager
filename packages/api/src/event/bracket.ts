import {
  computeStandings,
  isEmptySyncPlan,
  planBracketSync,
  resolveDoubleElim,
  seedsFromStandings,
} from '@league-manager/core';
import type {
  BracketSlotDef,
  BracketSource,
  BracketSyncPlan,
  Entrant,
  Match,
  PlayerStanding,
  ResolvedBracket,
  TierAssignment,
} from '@league-manager/core';

/**
 * An event season: one group stage (every match with no bracket slot) feeding
 * a double elimination bracket (every match with one). This module is the
 * only place that turns the database rows into a bracket, for both the public
 * standings and the admin sync, so the two can never disagree.
 */

/** How the bracket got (or is waiting for) its seeds. */
export type SeedingState =
  /** Seeds are stored on the roster; the bracket is running. */
  | 'set'
  /** The group is finished and ranked cleanly; the next sync stores these seeds. */
  | 'ready'
  /** Group matches are still being played. */
  | 'pending'
  /** The group is finished but head to head can't break a tie: seed by hand. */
  | 'tie'
  /** Some seeds are stored but not a full 1..n set. */
  | 'invalid';

export interface BracketEntrantView {
  state: Entrant['state'];
  player_id: number | null;
  name: string | null;
  seed: number | null;
  /** "Seed 3", "Winner UB QF2": where this side comes from. */
  source: string;
  score: number | null;
}

export interface BracketSlotView {
  id: string;
  section: BracketSlotDef['section'];
  label: string;
  short_label: string;
  status: string;
  a: BracketEntrantView;
  b: BracketEntrantView;
  winner_id: number | null;
  match_id: number | null;
  stale: boolean;
}

export interface BracketView {
  seeding: { state: SeedingState; tied_ranks: number[] };
  seeds: { seed: number; player_id: number; name: string }[];
  slots: BracketSlotView[];
  champion_id: number | null;
  runner_up_id: number | null;
}

export interface EventState {
  groupMatches: Match[];
  bracketMatches: Match[];
  standings: PlayerStanding[];
  seeding: { state: SeedingState; tiedRanks: number[] };
  seeds: Map<number, number> | null;
  bracket: ResolvedBracket;
  /** The group's tier: bracket matches are filed under it too. */
  tierId: string | null;
}

function storedSeeds(assignments: TierAssignment[]): Map<number, number> | 'none' | 'invalid' {
  const seeded = assignments.filter((a) => a.seed != null);
  if (seeded.length === 0) return 'none';
  const seeds = new Map<number, number>();
  for (const a of seeded) seeds.set(a.seed!, a.player_id);
  const complete = seeds.size === assignments.length &&
    [...seeds.keys()].every((s) => Number.isInteger(s) && s >= 1 && s <= assignments.length);
  return complete ? seeds : 'invalid';
}

/** Splits an event's matches into its two stages and works out the bracket. */
export function eventState(
  assignments: TierAssignment[],
  matches: Match[],
  playerNames: Record<number, string>,
): EventState {
  const groupMatches = matches.filter((m) => !m.bracket_slot);
  const bracketMatches = matches.filter((m) => !!m.bracket_slot);

  const standings = computeStandings({
    playerIds: assignments.map((a) => a.player_id),
    playerNames,
    matches: groupMatches,
    tiebreak: 'head_to_head',
  });

  let seeds: Map<number, number> | null = null;
  let seeding: EventState['seeding'];
  const stored = storedSeeds(assignments);
  if (stored instanceof Map) {
    seeds = stored;
    seeding = { state: 'set', tiedRanks: [] };
  } else if (stored === 'invalid') {
    seeding = { state: 'invalid', tiedRanks: [] };
  } else {
    const fromGroup = seedsFromStandings(standings, groupMatches);
    seeds = fromGroup.seeds;
    seeding = fromGroup.seeds
      ? { state: 'ready', tiedRanks: [] }
      : { state: fromGroup.reason === 'tie' ? 'tie' : 'pending', tiedRanks: fromGroup.tiedRanks };
  }

  return {
    groupMatches,
    bracketMatches,
    standings,
    seeding,
    seeds,
    bracket: resolveDoubleElim(seeds, bracketMatches, assignments.length),
    tierId: assignments[0]?.tier_id ?? null,
  };
}

function sourceLabel(source: BracketSource, short: Map<string, string>): string {
  if (source.kind === 'seed') return `Seed ${source.seed}`;
  const name = short.get(source.slot) ?? source.slot;
  return `${source.kind === 'winner' ? 'Winner' : 'Loser'} ${name}`;
}

/** The bracket as the web page draws it. */
export function bracketView(state: EventState, playerNames: Record<number, string>): BracketView {
  const seedOf = new Map<number, number>();
  for (const [seed, playerId] of state.seeds ?? []) seedOf.set(playerId, seed);
  const short = new Map(state.bracket.slots.map((s) => [s.def.id, s.def.shortLabel]));

  const side = (entrant: Entrant, source: BracketSource, match: Match | null, stale: boolean): BracketEntrantView => {
    const id = entrant.state === 'player' ? entrant.playerId : null;
    let score: number | null = null;
    if (id !== null && match && !stale && match.status !== 'pending') {
      score = match.player1_id === id ? match.player1_score : match.player2_id === id ? match.player2_score : null;
    }
    return {
      state: entrant.state,
      player_id: id,
      name: id !== null ? playerNames[id] ?? `Player ${id}` : null,
      seed: id !== null ? seedOf.get(id) ?? null : null,
      source: sourceLabel(source, short),
      score,
    };
  };

  return {
    seeding: { state: state.seeding.state, tied_ranks: state.seeding.tiedRanks },
    seeds: [...(state.seeds ?? [])]
      .sort((x, y) => x[0] - y[0])
      .map(([seed, player_id]) => ({ seed, player_id, name: playerNames[player_id] ?? `Player ${player_id}` })),
    slots: state.bracket.slots.map((s) => {
      const match = (s.match as Match | null) ?? null;
      return {
        id: s.def.id,
        section: s.def.section,
        label: s.def.label,
        short_label: s.def.shortLabel,
        status: s.status,
        a: side(s.a, s.def.a, match, s.stale),
        b: side(s.b, s.def.b, match, s.stale),
        winner_id: s.winnerId,
        match_id: match ? match.id : null,
        stale: s.stale,
      };
    }),
    champion_id: state.bracket.championId,
    runner_up_id: state.bracket.runnerUpId,
  };
}

/** Everything an event needs from the database, loaded in one round trip. */
export async function loadEvent(db: D1Database, seasonId: number) {
  const [assignments, matches, players] = await Promise.all([
    db.prepare('SELECT * FROM tier_assignments WHERE season_id = ?').bind(seasonId).all<TierAssignment>(),
    db.prepare('SELECT * FROM matches WHERE season_id = ? ORDER BY round_number ASC, id ASC').bind(seasonId).all<Match>(),
    db.prepare('SELECT id, display_name FROM players').all<{ id: number; display_name: string }>(),
  ]);
  const playerNames: Record<number, string> = {};
  for (const p of players.results) playerNames[p.id] = p.display_name;
  return {
    assignments: assignments.results,
    matches: matches.results,
    playerNames,
  };
}

export interface SyncResult {
  /** Seeds were taken from the finished group and stored on the roster. */
  seedsStored: boolean;
  plan: BracketSyncPlan;
}

/**
 * Brings an event's bracket match rows up to date with its results, the way
 * Challonge advances players. Safe to call any number of times: it only
 * writes what changed, never touches a match that has a result, and the
 * (season, slot) unique index stops a slot ever getting two rows.
 */
export async function syncEventBracket(db: D1Database, seasonId: number): Promise<SyncResult> {
  const loaded = await loadEvent(db, seasonId);
  let state = eventState(loaded.assignments, loaded.matches, loaded.playerNames);

  // Freeze seeds the moment the group is done, so a later group correction
  // can't silently reshuffle a bracket that is already being played.
  let seedsStored = false;
  if (state.seeding.state === 'ready' && state.seeds) {
    await db.batch(
      [...state.seeds].map(([seed, playerId]) =>
        db.prepare('UPDATE tier_assignments SET seed = ? WHERE season_id = ? AND player_id = ?')
          .bind(seed, seasonId, playerId),
      ),
    );
    seedsStored = true;
    const assignments = loaded.assignments.map((a) => ({ ...a, seed: [...state.seeds!].find(([, p]) => p === a.player_id)?.[0] ?? null }));
    state = eventState(assignments, loaded.matches, loaded.playerNames);
  }

  const plan = planBracketSync(state.bracket);
  if (isEmptySyncPlan(plan) || !state.tierId) return { seedsStored, plan };

  const bestOf = state.groupMatches[0]?.best_of ?? 1;
  const statements: D1PreparedStatement[] = [];
  for (const id of plan.remove) {
    statements.push(
      db.prepare(`DELETE FROM matches WHERE id = ? AND season_id = ? AND bracket_slot IS NOT NULL
                  AND status = 'pending' AND winner_id IS NULL AND player1_score + player2_score = 0`)
        .bind(id, seasonId),
    );
  }
  for (const r of plan.repair) {
    statements.push(
      db.prepare(`UPDATE matches SET player1_id = ?, player2_id = ?
                  WHERE id = ? AND season_id = ? AND bracket_slot = ?
                  AND status = 'pending' AND winner_id IS NULL AND player1_score + player2_score = 0`)
        .bind(r.player1_id, r.player2_id, r.matchId, seasonId, r.slot),
    );
  }
  for (const c of plan.create) {
    statements.push(
      db.prepare(`INSERT OR IGNORE INTO matches
                  (season_id, tier_id, player1_id, player2_id, best_of, status, bracket_slot)
                  VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
        .bind(seasonId, state.tierId, c.player1_id, c.player2_id, bestOf, c.slot),
    );
  }
  await db.batch(statements);
  return { seedsStored, plan };
}
