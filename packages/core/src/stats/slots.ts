/**
 * One completed game, joined with its match so both player ids are present.
 * Produced by the fetch layer (games ⨝ matches); core never touches SQL.
 */
export interface EnrichedGame {
  seasonId: number;
  tierId: string;
  matchId: number;
  round: number | null;
  gameNumber: number;
  player1Id: number;
  player2Id: number;
  player1CivId: string | null;
  player2CivId: string | null;
  mapId: string | null;
  winnerId: number | null;
}

/**
 * One game seen from a single player's side. A completed game explodes into
 * exactly two of these — one per participant. The atomic unit every civ/map/
 * game-level stat folds over.
 */
export interface SlotView {
  // filter dimensions
  seasonId: number;
  tierId: string;
  // structural chronology: season → round → game → match
  matchId: number;
  round: number | null;
  gameNumber: number;
  // who
  playerId: number;
  oppPlayerId: number;
  // what
  civId: string | null;
  oppCivId: string | null;
  mapId: string | null;
  // outcome for THIS side
  won: boolean;
}

/**
 * Explode enriched games into per-side slot views.
 *
 * Deliberate rule: only games with a decided winner that is one of the two
 * participants become slots — SlotView.won is a boolean, and an unresolved
 * game has no honest win/loss. In practice a `games` row only exists once a
 * result is reported, so this drops ~nothing; it just guards manually-incomplete
 * rows. If we ever want pure pick-counts that ignore outcome, relax it here.
 */
export function explodeToSlotViews(games: EnrichedGame[]): SlotView[] {
  const slots: SlotView[] = [];
  for (const g of games) {
    if (g.winnerId !== g.player1Id && g.winnerId !== g.player2Id) continue;

    const base = {
      seasonId: g.seasonId,
      tierId: g.tierId,
      matchId: g.matchId,
      round: g.round,
      gameNumber: g.gameNumber,
      mapId: g.mapId,
    };

    slots.push({
      ...base,
      playerId: g.player1Id,
      oppPlayerId: g.player2Id,
      civId: g.player1CivId,
      oppCivId: g.player2CivId,
      won: g.winnerId === g.player1Id,
    });
    slots.push({
      ...base,
      playerId: g.player2Id,
      oppPlayerId: g.player1Id,
      civId: g.player2CivId,
      oppCivId: g.player1CivId,
      won: g.winnerId === g.player2Id,
    });
  }
  return slots;
}

export interface KeyedRecord {
  key: string;
  played: number;
  won: number;
  winRate: number; // 0..1; caller applies min-sample thresholds + formatting
}

/**
 * Count played/won grouped by a projected key, skipping slots whose key is null
 * (can't attribute a stat to an unknown civ/map). Sorted played desc, then
 * winRate desc, then key asc — deterministic and stable. This is the shared
 * engine; every stat below is just a different filter + a different key.
 */
function tally(slots: SlotView[], keyOf: (s: SlotView) => string | null): KeyedRecord[] {
  const acc = new Map<string, { played: number; won: number }>();
  for (const s of slots) {
    const key = keyOf(s);
    if (key === null) continue;
    const cur = acc.get(key) ?? { played: 0, won: 0 };
    cur.played += 1;
    if (s.won) cur.won += 1;
    acc.set(key, cur);
  }

  const rows: KeyedRecord[] = [];
  for (const [key, { played, won }] of acc) {
    rows.push({ key, played, won, winRate: played === 0 ? 0 : won / played });
  }
  rows.sort(
    (a, b) => b.played - a.played || b.winRate - a.winRate || a.key.localeCompare(b.key),
  );
  return rows;
}

/** A player's civ table (aoe4world-style): most-played first, win rate per civ. */
export function computeCivStats(slots: SlotView[], playerId: number): KeyedRecord[] {
  return tally(slots.filter((s) => s.playerId === playerId), (s) => s.civId);
}

/** A player's map win-rate table. */
export function computeMapStats(slots: SlotView[], playerId: number): KeyedRecord[] {
  return tally(slots.filter((s) => s.playerId === playerId), (s) => s.mapId);
}

/**
 * League-wide civ popularity — the SAME tally, no player filter. Scope it
 * (season, tier, both, nothing) by pre-filtering `slots` before the call;
 * scope is a filter, never a fold parameter. Included here only to prove the
 * reuse claim — not wired to anything yet.
 */
export function computeCivPopularity(slots: SlotView[]): KeyedRecord[] {
  return tally(slots, (s) => s.civId);
}

export type StatsScope = 'all' | 'during' | 'since';

export interface ScopeSelection {
  scope: StatsScope;
  seasonId: number | null; // null only when scope === 'all'
}

/**
 * Pre-filter slot views by a season scope. `orderedSeasonIds` must be in
 * chronological order (oldest → newest); "since" is resolved by position in
 * that list, not by raw id value, so it stays correct even if season ids
 * aren't monotonic with time. Unknown/empty selections never over-filter.
 */
export function filterSlotsByScope(
  slots: SlotView[],
  selection: ScopeSelection,
  orderedSeasonIds: number[],
): SlotView[] {
  if (selection.scope === 'all' || selection.seasonId == null) return slots;

  if (selection.scope === 'during') {
    return slots.filter((s) => s.seasonId === selection.seasonId);
  }

  const startIndex = orderedSeasonIds.indexOf(selection.seasonId);
  if (startIndex === -1) return slots;
  const allowed = new Set(orderedSeasonIds.slice(startIndex));
  return slots.filter((s) => allowed.has(s.seasonId));
}