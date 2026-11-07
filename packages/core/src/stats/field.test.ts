import { describe, it, expect } from 'vitest';
import { computeFieldRecord } from './field';
import { explodeToSlotViews, type EnrichedGame } from './slots';
import type { EnrichedMatch } from './h2h';

const m = (matchId: number, seasonId: number, round: number, p1: number, p2: number, s1: number, s2: number, winnerId: number | null): EnrichedMatch => ({
  seasonId, titleId: 'aoe4', seasonIndex: seasonId, tierId: 'code_s', matchId, round, bestOf: 3,
  player1Id: p1, player2Id: p2, player1Score: s1, player2Score: s2, winnerId, completedAt: null,
});

// Osiris = 1. Played Bob (2) and Carol (3) over two seasons; one unplayed.
const matches: EnrichedMatch[] = [
  m(10, 1, 1, 1, 2, 2, 1, 1),
  m(11, 1, 2, 1, 3, 0, 2, 3),
  m(20, 2, 1, 1, 2, 2, 0, 1),
  m(21, 2, 3, 1, 3, 2, 1, 1),
  m(22, 2, 4, 1, 2, 0, 0, null), // unplayed: must not count
  m(30, 2, 1, 2, 3, 2, 0, 2),    // not Osiris's match: must not count
];

const g = (matchId: number, seasonId: number, n: number, p1: number, p2: number, c1: string, c2: string, winnerId: number): EnrichedGame => ({
  seasonId, titleId: 'aoe4', tierId: 'code_s', matchId, round: 1, gameNumber: n,
  player1Id: p1, player2Id: p2, player1CivId: c1, player2CivId: c2, mapId: null, winnerId,
});
const slots = explodeToSlotViews([
  g(10, 1, 1, 1, 2, 'french', 'rus', 1),
  g(10, 1, 2, 1, 2, 'malians', 'rus', 2),
  g(10, 1, 3, 1, 2, 'french', 'english', 1),
  g(11, 1, 1, 1, 3, 'french', 'hre', 3),
  g(30, 2, 1, 2, 3, 'rus', 'hre', 2),
]);

describe('computeFieldRecord', () => {
  it('counts decided matches only, games from match scores, against everyone', () => {
    const r = computeFieldRecord(matches, slots, 1);
    expect(r.matches).toEqual({ won: 3, lost: 1 });
    expect(r.games).toEqual({ won: 6, lost: 4 });
  });

  it('form is newest first in structural order (season, round, match)', () => {
    expect(computeFieldRecord(matches, slots, 1).form).toEqual(['W', 'W', 'L', 'W']);
    expect(computeFieldRecord(matches, slots, 1, { formLength: 2 }).form).toEqual(['W', 'W']);
  });

  it('civs are the player’s own, most played first, capped', () => {
    const civs = computeFieldRecord(matches, slots, 1).civs;
    expect(civs.map((c) => [c.key, c.played, c.won])).toEqual([['french', 3, 2], ['malians', 1, 0]]);
    expect(computeFieldRecord(matches, slots, 1, { civLimit: 1 }).civs).toHaveLength(1);
  });

  it('scope is a pre-filter: one season only', () => {
    const r = computeFieldRecord(matches.filter((x) => x.seasonId === 2), [], 1);
    expect(r.matches).toEqual({ won: 2, lost: 0 });
    expect(r.form).toEqual(['W', 'W']);
  });

  it('a player with no matches is a zeroed record, not an error', () => {
    expect(computeFieldRecord(matches, slots, 99)).toEqual({
      playerId: 99, matches: { won: 0, lost: 0 }, games: { won: 0, lost: 0 }, form: [], civs: [],
    });
  });
});
