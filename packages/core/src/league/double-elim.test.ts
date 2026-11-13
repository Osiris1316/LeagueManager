import { describe, expect, it } from 'vitest';
import {
  DOUBLE_ELIM_8,
  isEmptySyncPlan,
  planBracketSync,
  resolveDoubleElim,
  type BracketMatch,
  type ResolvedBracket,
} from './double-elim.js';

/** Seeds 1..n → player ids 101..10n (seed 3 is player 103, easy to read). */
function seedsFor(n: number): Map<number, number> {
  return new Map(Array.from({ length: n }, (_, i) => [i + 1, 101 + i]));
}

const slot = (b: ResolvedBracket, id: string) => b.slots.find((s) => s.def.id === id)!;
const pid = (e: { state: string; playerId?: number }) => (e.state === 'player' ? e.playerId : e.state);

/**
 * Runs a whole bracket the way the API does: sync, play every ready match,
 * repeat. `pick` chooses each winner. Returns the final state and the rows.
 */
function simulate(
  seeds: Map<number, number>,
  pick: (slotId: string, a: number, b: number) => number,
) {
  const rows: BracketMatch[] = [];
  let nextId = 1;
  const order: string[] = [];
  for (let guard = 0; guard < 40; guard++) {
    const plan = planBracketSync(resolveDoubleElim(seeds, rows));
    expect(plan.repair).toEqual([]);
    expect(plan.remove).toEqual([]);
    for (const c of plan.create) {
      rows.push({ id: nextId++, bracket_slot: c.slot, player1_id: c.player1_id, player2_id: c.player2_id,
        player1_score: 0, player2_score: 0, winner_id: null, status: 'pending' });
    }
    const open = rows.filter((r) => r.status !== 'complete');
    if (open.length === 0) break;
    for (const r of open) {
      const s = slot(resolveDoubleElim(seeds, rows), r.bracket_slot!);
      const a = (s.a as { playerId: number }).playerId;
      const b = (s.b as { playerId: number }).playerId;
      const w = pick(r.bracket_slot!, a, b);
      r.winner_id = w;
      r.status = 'complete';
      r.player1_score = w === r.player1_id ? 1 : 0;
      r.player2_score = w === r.player2_id ? 1 : 0;
      order.push(r.bracket_slot!);
    }
  }
  return { final: resolveDoubleElim(seeds, rows), rows, order };
}

/** The other two quarterfinals, created and not yet played. */
const otherQuarters = (): BracketMatch[] => [
  { id: 90, bracket_slot: 'UB-QF3', player1_id: 102, player2_id: 107, player1_score: 0, player2_score: 0, winner_id: null, status: 'pending' },
  { id: 91, bracket_slot: 'UB-QF4', player1_id: 103, player2_id: 106, player1_score: 0, player2_score: 0, winner_id: null, status: 'pending' },
];

/** The better seed (lower player id here) always wins. */
const favourite = (_slot: string, a: number, b: number) => Math.min(a, b);

describe('bracket definition', () => {
  it('lists every slot after the slots that feed it', () => {
    const seen = new Set<string>();
    for (const def of DOUBLE_ELIM_8) {
      for (const src of [def.a, def.b]) {
        if (src.kind !== 'seed') expect(seen.has(src.slot)).toBe(true);
      }
      seen.add(def.id);
    }
  });
});

describe('resolveDoubleElim with seven players', () => {
  it('waits for seeds before anything is ready', () => {
    const b = resolveDoubleElim(null, []);
    expect(b.slots.every((s) => s.status === 'waiting')).toBe(true);
    expect(isEmptySyncPlan(planBracketSync(b))).toBe(true);
  });

  it('gives seed 1 a bye to the upper semifinal and opens three quarterfinals', () => {
    const b = resolveDoubleElim(seedsFor(7), []);
    expect(slot(b, 'UB-QF1').status).toBe('bye');
    expect(slot(b, 'UB-QF1').winnerId).toBe(101);
    expect(['UB-QF2', 'UB-QF3', 'UB-QF4'].map((id) => slot(b, id).status)).toEqual(['ready', 'ready', 'ready']);
    expect(pid(slot(b, 'UB-SF1').a)).toBe(101);
    expect(slot(b, 'UB-SF1').status).toBe('waiting');

    const plan = planBracketSync(b);
    expect(plan.create).toEqual([
      { slot: 'UB-QF2', player1_id: 104, player2_id: 105 },
      { slot: 'UB-QF3', player1_id: 102, player2_id: 107 },
      { slot: 'UB-QF4', player1_id: 103, player2_id: 106 },
    ]);
  });

  it('sends the loser of 4 v 5 straight to lower round 2, against the loser of upper semi 2', () => {
    const rows: BracketMatch[] = [
      { id: 1, bracket_slot: 'UB-QF2', player1_id: 104, player2_id: 105, player1_score: 0, player2_score: 1, winner_id: 105, status: 'complete' },
      ...otherQuarters(),
    ];
    const b = resolveDoubleElim(seedsFor(7), rows);
    expect(slot(b, 'LB-R1-1').status).toBe('bye');
    expect(slot(b, 'LB-R1-1').winnerId).toBe(104);
    expect(pid(slot(b, 'LB-R2-1').b)).toBe(104);
    expect(pid(slot(b, 'UB-SF1').b)).toBe(105);
    expect(planBracketSync(b).create).toEqual([{ slot: 'UB-SF1', player1_id: 101, player2_id: 105 }]);
  });

  it('plays 12 matches with no reset when the upper bracket winner takes the final', () => {
    const { final, rows } = simulate(seedsFor(7), favourite);
    expect(rows).toHaveLength(12);
    expect(final.championId).toBe(101);
    expect(final.runnerUpId).toBe(102);
    expect(slot(final, 'GF-RESET').status).toBe('skipped');
    expect(rows.every((r) => r.player1_id < r.player2_id)).toBe(true);
  });

  it('adds the reset game only when the lower bracket player wins the first final', () => {
    // Favourites win everywhere except: seed 2 beats seed 1 in the upper final,
    // then seed 1 (from the lower bracket) wins the grand final, forcing a reset.
    const pick = (s: string, a: number, b: number) => {
      if (s === 'UB-F') return 102;
      if (s === 'GF') return 101;
      if (s === 'GF-RESET') return 101;
      return Math.min(a, b);
    };
    const { final, rows, order } = simulate(seedsFor(7), pick);
    expect(rows).toHaveLength(13);
    expect(order.slice(-2)).toEqual(['GF', 'GF-RESET']);
    expect(pid(slot(final, 'GF').a)).toBe(102);
    expect(pid(slot(final, 'GF').b)).toBe(101);
    expect(final.championId).toBe(101);
    expect(final.runnerUpId).toBe(102);
  });

  it('crowns the upper winner if they win the reset', () => {
    const pick = (s: string, a: number, b: number) => {
      if (s === 'UB-F') return 102;
      if (s === 'GF') return 101;
      if (s === 'GF-RESET') return 102;
      return Math.min(a, b);
    };
    const { final } = simulate(seedsFor(7), pick);
    expect(final.championId).toBe(102);
    expect(final.runnerUpId).toBe(101);
  });

  it('never pairs two players who just met, in lower round 2', () => {
    // Every combination of quarterfinal and semifinal results.
    for (let mask = 0; mask < 64; mask++) {
      const pick = (s: string, a: number, b: number) => {
        const bit = ['UB-QF2', 'UB-QF3', 'UB-QF4', 'UB-SF1', 'UB-SF2', 'LB-R1-2'].indexOf(s);
        if (bit < 0) return Math.min(a, b);
        return (mask >> bit) & 1 ? Math.max(a, b) : Math.min(a, b);
      };
      const { rows } = simulate(seedsFor(7), pick);
      const met = (x: number, y: number, slots: string[]) =>
        rows.some((r) => slots.includes(r.bracket_slot!) &&
          ((r.player1_id === x && r.player2_id === y) || (r.player1_id === y && r.player2_id === x)));
      for (const lb of rows.filter((r) => r.bracket_slot!.startsWith('LB-R2'))) {
        expect(met(lb.player1_id, lb.player2_id, ['UB-QF2', 'UB-QF3', 'UB-QF4', 'UB-SF1', 'UB-SF2'])).toBe(false);
      }
    }
  });
});

describe('resolveDoubleElim with other player counts', () => {
  it.each([
    [8, 14],
    [7, 12],
    [6, 10],
    [5, 8],
  ])('%i players: every player but the champion loses twice (%i matches, no reset)', (n, expected) => {
    const { final, rows } = simulate(seedsFor(n), favourite);
    expect(rows).toHaveLength(expected);
    expect(final.championId).toBe(101);
    const losses = new Map<number, number>();
    for (const r of rows) {
      const l = r.winner_id === r.player1_id ? r.player2_id : r.player1_id;
      losses.set(l, (losses.get(l) ?? 0) + 1);
    }
    expect([...losses.values()].every((x) => x === 2)).toBe(true);
    expect(losses.size).toBe(n - 1);
  });
});

describe('planBracketSync after a corrected result', () => {
  const seeds = seedsFor(7);
  const base = (): BracketMatch[] => [
    { id: 1, bracket_slot: 'UB-QF2', player1_id: 104, player2_id: 105, player1_score: 1, player2_score: 0, winner_id: 104, status: 'complete' },
    { id: 2, bracket_slot: 'UB-SF1', player1_id: 101, player2_id: 104, player1_score: 0, player2_score: 0, winner_id: null, status: 'pending' },
    ...otherQuarters(),
  ];

  it('changes the players on an unplayed match, keeping its id', () => {
    const rows = base();
    rows[0] = { ...rows[0]!, player1_score: 0, player2_score: 1, winner_id: 105 };
    const plan = planBracketSync(resolveDoubleElim(seeds, rows));
    expect(plan.repair).toEqual([{ matchId: 2, slot: 'UB-SF1', player1_id: 101, player2_id: 105 }]);
    expect(plan.create).toEqual([]);
  });

  it('removes an unplayed match whose slot is no longer ready', () => {
    const rows = base();
    rows[0] = { ...rows[0]!, player1_score: 0, player2_score: 0, winner_id: null, status: 'pending' };
    const plan = planBracketSync(resolveDoubleElim(seeds, rows));
    expect(plan.remove).toEqual([2]);
  });

  it('leaves a played match alone and marks the slot stale', () => {
    const rows = base();
    rows[0] = { ...rows[0]!, player1_score: 0, player2_score: 1, winner_id: 105 };
    rows[1] = { ...rows[1]!, player1_score: 1, player2_score: 0, winner_id: 101, status: 'complete' };
    const b = resolveDoubleElim(seeds, rows);
    expect(slot(b, 'UB-SF1').stale).toBe(true);
    expect(slot(b, 'UB-SF1').status).toBe('ready');
    const plan = planBracketSync(b);
    expect(plan.repair).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.create).toEqual([]);
  });
});
