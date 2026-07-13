import { describe, it, expect } from 'vitest';
import {
  explodeToSlotViews, computeCivStats, computeMapStats,
  computeCivPopularity, type EnrichedGame,
} from './slots';

// 1 = Osiris, 2 = Bob, 3 = Carol   (player1Id < player2Id holds in every match)
const games: EnrichedGame[] = [
  // Match A: Osiris vs Bob, Bo3 → Osiris 2-1
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 1, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 2, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'mongols', mapId: 'black-forest', winnerId: 2 },
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 3, player1Id: 1, player2Id: 2, player1CivId: 'abbasid', player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  // Match B: Osiris vs Carol, split → 1-1
  { seasonId: 1, tierId: 'code_b', matchId: 11, round: 2, gameNumber: 1, player1Id: 1, player2Id: 3, player1CivId: 'french',  player2CivId: 'mongols', mapId: 'black-forest', winnerId: 3 },
  { seasonId: 1, tierId: 'code_b', matchId: 11, round: 2, gameNumber: 2, player1Id: 1, player2Id: 3, player1CivId: 'abbasid', player2CivId: 'delhi',   mapId: 'dry-arabia',   winnerId: 1 },
];

describe('explodeToSlotViews', () => {
  it('two slots per game — counts observations, not games', () => {
    expect(explodeToSlotViews(games)).toHaveLength(games.length * 2); // 10
  });
});

describe('Osiris (1) profile', () => {
  const slots = explodeToSlotViews(games);
  it('civ table aggregates across matches, most-played first', () => {
    expect(computeCivStats(slots, 1)).toEqual([
      { key: 'french',  played: 3, won: 1, winRate: 1 / 3 }, // A-g1 W, A-g2 L, B-g1 L
      { key: 'abbasid', played: 2, won: 2, winRate: 1 },     // A-g3 W, B-g2 W
    ]);
  });
  it('map table tallies per map across matches', () => {
    expect(computeMapStats(slots, 1)).toEqual([
      { key: 'dry-arabia',   played: 3, won: 3, winRate: 1 }, // A-g1, A-g3, B-g2 all W
      { key: 'black-forest', played: 2, won: 0, winRate: 0 }, // A-g2, B-g1 both L
    ]);
  });
});

describe('league civ popularity (same tally)', () => {
  const slots = explodeToSlotViews(games);
  it('ties out to 2× games — no double-count', () => {
    const pop = computeCivPopularity(slots);
    expect(pop.reduce((n, r) => n + r.played, 0)).toBe(games.length * 2); // 10
    expect(pop[0]).toMatchObject({ key: 'french', played: 3 }); // most-picked
  });
  it('scope is a pre-filter, not a fold param', () => {
    const scoped = slots.filter((s) => s.seasonId === 1 && s.tierId === 'code_b');
    expect(computeCivPopularity(scoped)).toEqual(computeCivPopularity(slots));
  });
});