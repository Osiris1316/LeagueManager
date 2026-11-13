/**
 * Double elimination bracket for up to eight players. Pure functions, no
 * database access.
 *
 * The bracket is data: a fixed list of slots, each fed by a seed, or by the
 * winner or loser of an earlier slot. Seeds that don't exist become byes, so
 * the same definition serves 5 to 8 players (with 7, seed 1 gets a bye to the
 * upper semifinal and the loser of 4 v 5 gets a bye to lower round 2).
 *
 * A match row in the database fills a slot when its `bracket_slot` column
 * holds the slot id. Slot ids are stored, so they are permanent once used.
 */

export type BracketSource =
  | { kind: 'seed'; seed: number }
  | { kind: 'winner'; slot: string }
  | { kind: 'loser'; slot: string };

export type BracketSection = 'upper' | 'lower' | 'final';

export interface BracketSlotDef {
  /** Stored in matches.bracket_slot. */
  id: string;
  section: BracketSection;
  /** "Upper quarterfinal 2" */
  label: string;
  /** "UB QF2", for tight places such as card end caps. */
  shortLabel: string;
  a: BracketSource;
  b: BracketSource;
  /**
   * The grand final reset: played only when side b (the lower bracket
   * player) wins the named slot. Its players are that slot's players.
   */
  resetOf?: string;
}

const seed = (n: number): BracketSource => ({ kind: 'seed', seed: n });
const winner = (slot: string): BracketSource => ({ kind: 'winner', slot });
const loser = (slot: string): BracketSource => ({ kind: 'loser', slot });

/**
 * Eight-seed double elimination. Listed in play order: every slot comes after
 * the slots that feed it. Lower round 2 crosses halves (the loser of upper
 * semi 2 meets the survivor from upper semi 1's side, and the other way
 * round) so nobody replays the opponent they just lost to.
 */
export const DOUBLE_ELIM_8: readonly BracketSlotDef[] = [
  { id: 'UB-QF1', section: 'upper', label: 'Upper quarterfinal 1', shortLabel: 'UB QF1', a: seed(1), b: seed(8) },
  { id: 'UB-QF2', section: 'upper', label: 'Upper quarterfinal 2', shortLabel: 'UB QF2', a: seed(4), b: seed(5) },
  { id: 'UB-QF3', section: 'upper', label: 'Upper quarterfinal 3', shortLabel: 'UB QF3', a: seed(2), b: seed(7) },
  { id: 'UB-QF4', section: 'upper', label: 'Upper quarterfinal 4', shortLabel: 'UB QF4', a: seed(3), b: seed(6) },
  { id: 'UB-SF1', section: 'upper', label: 'Upper semifinal 1', shortLabel: 'UB SF1', a: winner('UB-QF1'), b: winner('UB-QF2') },
  { id: 'UB-SF2', section: 'upper', label: 'Upper semifinal 2', shortLabel: 'UB SF2', a: winner('UB-QF3'), b: winner('UB-QF4') },
  { id: 'UB-F', section: 'upper', label: 'Upper final', shortLabel: 'UB final', a: winner('UB-SF1'), b: winner('UB-SF2') },
  { id: 'LB-R1-1', section: 'lower', label: 'Lower round 1, match 1', shortLabel: 'LB R1-1', a: loser('UB-QF1'), b: loser('UB-QF2') },
  { id: 'LB-R1-2', section: 'lower', label: 'Lower round 1, match 2', shortLabel: 'LB R1-2', a: loser('UB-QF3'), b: loser('UB-QF4') },
  { id: 'LB-R2-1', section: 'lower', label: 'Lower round 2, match 1', shortLabel: 'LB R2-1', a: loser('UB-SF2'), b: winner('LB-R1-1') },
  { id: 'LB-R2-2', section: 'lower', label: 'Lower round 2, match 2', shortLabel: 'LB R2-2', a: loser('UB-SF1'), b: winner('LB-R1-2') },
  { id: 'LB-SF', section: 'lower', label: 'Lower semifinal', shortLabel: 'LB semi', a: winner('LB-R2-1'), b: winner('LB-R2-2') },
  { id: 'LB-F', section: 'lower', label: 'Lower final', shortLabel: 'LB final', a: loser('UB-F'), b: winner('LB-SF') },
  { id: 'GF', section: 'final', label: 'Grand final', shortLabel: 'Final', a: winner('UB-F'), b: winner('LB-F') },
  { id: 'GF-RESET', section: 'final', label: 'Grand final reset', shortLabel: 'Reset', a: winner('UB-F'), b: winner('LB-F'), resetOf: 'GF' },
];

export const DOUBLE_ELIM_8_SEEDS = 8;

const SLOT_BY_ID = new Map(DOUBLE_ELIM_8.map((s) => [s.id, s]));

export function bracketSlotById(id: string | null | undefined): BracketSlotDef | undefined {
  return id ? SLOT_BY_ID.get(id) : undefined;
}

/** Who sits on one side of a slot. */
export type Entrant =
  | { state: 'player'; playerId: number }
  /** Nobody will ever arrive from here. */
  | { state: 'bye' }
  /** Not known yet. */
  | { state: 'pending' };

export type SlotStatus =
  /** At least one side isn't known yet. */
  | 'waiting'
  /** Both players known, no result yet: a match should exist. */
  | 'ready'
  | 'complete'
  /** One player and one bye: the player goes through without playing. */
  | 'bye'
  /** Nobody plays here: two byes, or a reset that isn't needed. */
  | 'skipped';

/** The match fields the bracket reads. */
export interface BracketMatch {
  id: number;
  bracket_slot?: string | null;
  player1_id: number;
  player2_id: number;
  player1_score: number;
  player2_score: number;
  winner_id: number | null;
  status: string;
}

export interface ResolvedSlot {
  def: BracketSlotDef;
  a: Entrant;
  b: Entrant;
  status: SlotStatus;
  winnerId: number | null;
  loserId: number | null;
  /** The match row filling this slot, if one exists. */
  match: BracketMatch | null;
  /**
   * A match row exists for the slot but its players aren't the slot's players
   * (an earlier result was changed after this one was played). Its result is
   * ignored until an admin sorts it out.
   */
  stale: boolean;
}

export interface ResolvedBracket {
  slots: ResolvedSlot[];
  championId: number | null;
  runnerUpId: number | null;
}

const PENDING: Entrant = { state: 'pending' };
const BYE: Entrant = { state: 'bye' };
const player = (playerId: number): Entrant => ({ state: 'player', playerId });

function samePair(m: BracketMatch, x: number, y: number): boolean {
  return (m.player1_id === x && m.player2_id === y) || (m.player1_id === y && m.player2_id === x);
}

/**
 * Works out every slot from the seeds and the results so far.
 *
 * @param seeds seed number → player id, or null while seeding isn't settled
 *   (every seeded side is then pending). Seeds missing from the map are byes.
 * @param matches the season's bracket match rows (rows without a slot are ignored)
 */
export function resolveDoubleElim(
  seeds: ReadonlyMap<number, number> | null,
  matches: readonly BracketMatch[],
): ResolvedBracket {
  const bySlot = new Map<string, BracketMatch>();
  for (const m of matches) {
    if (m.bracket_slot && SLOT_BY_ID.has(m.bracket_slot)) bySlot.set(m.bracket_slot, m);
  }

  const resolved = new Map<string, ResolvedSlot>();

  const entrantFrom = (source: BracketSource): Entrant => {
    if (source.kind === 'seed') {
      if (!seeds) return PENDING;
      const id = seeds.get(source.seed);
      return id === undefined ? BYE : player(id);
    }
    const from = resolved.get(source.slot);
    if (!from) return PENDING;
    if (from.status === 'skipped') return BYE;
    if (from.status === 'bye') {
      // The player who walked through is the winner; there is no loser.
      return source.kind === 'winner' && from.winnerId !== null ? player(from.winnerId) : BYE;
    }
    if (from.status !== 'complete') return PENDING;
    const id = source.kind === 'winner' ? from.winnerId : from.loserId;
    return id === null ? PENDING : player(id);
  };

  for (const def of DOUBLE_ELIM_8) {
    const match = bySlot.get(def.id) ?? null;
    let a = entrantFrom(def.a);
    let b = entrantFrom(def.b);
    let status: SlotStatus;
    let winnerId: number | null = null;
    let loserId: number | null = null;
    let stale = false;

    if (def.resetOf) {
      // Played only if the lower bracket player won the first grand final.
      const first = resolved.get(def.resetOf);
      if (!first || first.status !== 'complete') {
        status = first && (first.status === 'bye' || first.status === 'skipped') ? 'skipped' : 'waiting';
        a = first?.a ?? PENDING;
        b = first?.b ?? PENDING;
      } else if (first.b.state === 'player' && first.winnerId === first.b.playerId) {
        status = 'ready';
      } else {
        status = 'skipped';
      }
    } else if (a.state === 'player' && b.state === 'player') {
      status = 'ready';
    } else if (a.state === 'bye' && b.state === 'bye') {
      status = 'skipped';
    } else if (a.state === 'bye' && b.state === 'player') {
      status = 'bye';
      winnerId = b.playerId;
    } else if (b.state === 'bye' && a.state === 'player') {
      status = 'bye';
      winnerId = a.playerId;
    } else {
      status = 'waiting';
    }

    if (status === 'ready' && a.state === 'player' && b.state === 'player' && match) {
      if (!samePair(match, a.playerId, b.playerId)) {
        stale = true;
      } else if (
        match.status === 'complete' &&
        (match.winner_id === a.playerId || match.winner_id === b.playerId)
      ) {
        status = 'complete';
        winnerId = match.winner_id;
        loserId = match.winner_id === a.playerId ? b.playerId : a.playerId;
      }
    }

    resolved.set(def.id, { def, a, b, status, winnerId, loserId, match, stale });
  }

  const gf = resolved.get('GF')!;
  const reset = resolved.get('GF-RESET')!;
  let championId: number | null = null;
  let runnerUpId: number | null = null;
  if (reset.status === 'complete') {
    championId = reset.winnerId;
    runnerUpId = reset.loserId;
  } else if (gf.status === 'complete' && reset.status === 'skipped') {
    championId = gf.winnerId;
    runnerUpId = gf.loserId;
  }

  return { slots: DOUBLE_ELIM_8.map((d) => resolved.get(d.id)!), championId, runnerUpId };
}

/** A match row to create for a slot that just became ready. */
export interface BracketCreate {
  slot: string;
  player1_id: number;
  player2_id: number;
}

/** An unplayed row whose players changed because an earlier result changed. */
export interface BracketRepair {
  matchId: number;
  slot: string;
  player1_id: number;
  player2_id: number;
}

export interface BracketSyncPlan {
  create: BracketCreate[];
  repair: BracketRepair[];
  /** Unplayed rows for slots that are no longer ready. */
  remove: number[];
}

function hasResult(m: BracketMatch): boolean {
  return m.status !== 'pending' || m.winner_id !== null || m.player1_score + m.player2_score > 0;
}

function ordered(x: number, y: number): { player1_id: number; player2_id: number } {
  return x < y ? { player1_id: x, player2_id: y } : { player1_id: y, player2_id: x };
}

/**
 * What to write so the match rows agree with the bracket, the way Challonge
 * advances players: create a row for every slot that is ready and has none,
 * fix the players on unplayed rows whose slot changed, and remove unplayed rows
 * whose slot is no longer ready. Rows with any result are never touched; a
 * changed earlier result shows up as `stale` on the slot for an admin to sort.
 *
 * Player ids are written low first, as the matches table requires.
 */
export function planBracketSync(bracket: ResolvedBracket): BracketSyncPlan {
  const plan: BracketSyncPlan = { create: [], repair: [], remove: [] };

  for (const slot of bracket.slots) {
    const { match, a, b } = slot;
    const ready = (slot.status === 'ready' || slot.status === 'complete') &&
      a.state === 'player' && b.state === 'player';

    if (!match) {
      if (ready) plan.create.push({ slot: slot.def.id, ...ordered(a.playerId, b.playerId) });
      continue;
    }
    if (hasResult(match)) continue;

    if (ready) {
      if (!samePair(match, a.playerId, b.playerId)) {
        plan.repair.push({ matchId: match.id, slot: slot.def.id, ...ordered(a.playerId, b.playerId) });
      }
    } else {
      plan.remove.push(match.id);
    }
  }

  return plan;
}

/** True when the plan changes nothing. */
export function isEmptySyncPlan(plan: BracketSyncPlan): boolean {
  return plan.create.length === 0 && plan.repair.length === 0 && plan.remove.length === 0;
}
