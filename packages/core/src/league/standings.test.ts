import { describe, expect, it } from 'vitest';
import { computeStandings, seedsFromStandings } from './standings.js';
import type { Match } from '../types/league.js';

let nextId = 1;
/** A Bo1 between two players; `winner` null leaves it unplayed. */
function bo1(p: number, q: number, winner: number | null): Match {
  const [a, b] = p < q ? [p, q] : [q, p];
  return {
    id: nextId++, season_id: 1, tier_id: 'code_s', player1_id: a, player2_id: b, best_of: 1,
    status: winner ? 'complete' : 'pending', winner_id: winner,
    player1_score: winner === a ? 1 : 0, player2_score: winner === b ? 1 : 0,
    scheduled_at: null, started_at: null, completed_at: null,
    map_draft_id: null, civ_draft_id: null, round_number: 1,
  };
}

const names: Record<number, string> = { 1: 'Ana', 2: 'Bo', 3: 'Cy', 4: 'Di' };
const order = (rows: { player_id: number }[]) => rows.map((r) => r.player_id);
const ranks = (rows: { rank: number }[]) => rows.map((r) => r.rank);

describe('computeStandings, head to head', () => {
  it('breaks a two-way tie by the match between them, whatever the names', () => {
    // Di beat Ana; both 2-1.
    const matches = [bo1(1, 2, 1), bo1(1, 3, 1), bo1(1, 4, 4), bo1(2, 3, 2), bo1(2, 4, 4), bo1(3, 4, 3)];
    // Ana 2-1, Di 2-1, Bo 1-2, Cy 1-2 (Cy beat Di, Bo beat Cy)
    const s = computeStandings({ playerIds: [1, 2, 3, 4], playerNames: names, matches, tiebreak: 'head_to_head' });
    expect(order(s)).toEqual([4, 1, 2, 3]);
    expect(ranks(s)).toEqual([1, 2, 3, 4]);
  });

  it('splits a three-way tie when one player beat both others', () => {
    // Everyone beat Di. Cy beat Ana and Bo; Ana beat Bo.
    const matches = [bo1(1, 4, 1), bo1(2, 4, 2), bo1(3, 4, 3), bo1(1, 3, 3), bo1(2, 3, 3), bo1(1, 2, 1)];
    const s = computeStandings({ playerIds: [1, 2, 3, 4], playerNames: names, matches, tiebreak: 'head_to_head' });
    expect(order(s)).toEqual([3, 1, 2, 4]);
    expect(ranks(s)).toEqual([1, 2, 3, 4]);
  });

  it('applies head to head again inside a group still level', () => {
    // Four players all 1-1 after a partial schedule would be odd; use a 5th:
    // Ana, Bo, Cy each 2-1 among the top; Cy beat Ana and Bo, Bo beat Ana.
    const n = { ...names, 5: 'Ed' };
    const matches = [
      bo1(1, 4, 1), bo1(2, 4, 2), bo1(3, 4, 4), bo1(1, 5, 1), bo1(2, 5, 2), bo1(3, 5, 3),
      bo1(1, 2, 2), bo1(1, 3, 3), bo1(2, 3, 3), bo1(4, 5, 4),
    ];
    // Ana 2-2, Bo 3-1, Cy 3-1, Di 2-2, Ed 0-4. Bo/Cy: Cy won. Ana/Di: Ana won.
    const s = computeStandings({ playerIds: [1, 2, 3, 4, 5], playerNames: n, matches, tiebreak: 'head_to_head' });
    expect(order(s)).toEqual([3, 2, 1, 4, 5]);
    expect(ranks(s)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shares a rank on a three-way circle head to head cannot break', () => {
    // Ana beat Bo, Bo beat Cy, Cy beat Ana; all beat Di.
    const matches = [bo1(1, 2, 1), bo1(2, 3, 2), bo1(1, 3, 3), bo1(1, 4, 1), bo1(2, 4, 2), bo1(3, 4, 3)];
    const s = computeStandings({ playerIds: [1, 2, 3, 4], playerNames: names, matches, tiebreak: 'head_to_head' });
    expect(order(s)).toEqual([1, 2, 3, 4]);
    expect(ranks(s)).toEqual([1, 1, 1, 4]);
  });

  it('leaves the default league rule unchanged (game differential, then name)', () => {
    const matches = [bo1(1, 4, 4), bo1(2, 3, 2)];
    const s = computeStandings({ playerIds: [1, 2, 3, 4], playerNames: names, matches });
    expect(order(s)).toEqual([2, 4, 1, 3]);
    expect(ranks(s)).toEqual([1, 1, 3, 3]);
  });
});

describe('seedsFromStandings', () => {
  it('waits until every group match is complete', () => {
    const matches = [bo1(1, 2, 1), bo1(1, 3, null), bo1(2, 3, 2)];
    const s = computeStandings({ playerIds: [1, 2, 3], playerNames: names, matches, tiebreak: 'head_to_head' });
    expect(seedsFromStandings(s, matches)).toEqual({ seeds: null, reason: 'group_unfinished', tiedRanks: [] });
  });

  it('seeds by final rank once the group is done', () => {
    const matches = [bo1(1, 2, 2), bo1(1, 3, 1), bo1(2, 3, 2)];
    const s = computeStandings({ playerIds: [1, 2, 3], playerNames: names, matches, tiebreak: 'head_to_head' });
    const result = seedsFromStandings(s, matches);
    expect(result.reason).toBeNull();
    expect([...result.seeds!]).toEqual([[1, 2], [2, 1], [3, 3]]);
  });

  it('refuses to seed through an unbroken tie', () => {
    const matches = [bo1(1, 2, 1), bo1(2, 3, 2), bo1(1, 3, 3), bo1(1, 4, 1), bo1(2, 4, 2), bo1(3, 4, 3)];
    const s = computeStandings({ playerIds: [1, 2, 3, 4], playerNames: names, matches, tiebreak: 'head_to_head' });
    expect(seedsFromStandings(s, matches)).toEqual({ seeds: null, reason: 'tie', tiedRanks: [1] });
  });
});
