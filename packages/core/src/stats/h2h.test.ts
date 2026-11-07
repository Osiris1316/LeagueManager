import { describe, it, expect } from 'vitest';
import { explodeToSlotViews, type EnrichedGame } from './slots';
import {
  computeH2H,
  computeCivMatchups,
  computeMeetings,
  computePairGames,
  computeTitleRecords,
  type EnrichedMatch,
} from './h2h';

// 1 = Osiris, 2 = Bob, 3 = Carol, 4 = never-played.  player1Id < player2Id throughout.
const matches: EnrichedMatch[] = [
  { seasonId: 1, titleId: 'aoe4', seasonIndex: 1, tierId: 'code_b', matchId: 10, round: 1, bestOf: 3, player1Id: 1, player2Id: 2, player1Score: 2, player2Score: 1, winnerId: 1, completedAt: '2026-01-10' },
  { seasonId: 2, titleId: 'aoe4', seasonIndex: 2, tierId: 'code_b', matchId: 20, round: 3, bestOf: 3, player1Id: 1, player2Id: 2, player1Score: 0, player2Score: 2, winnerId: 2, completedAt: '2026-03-05' },
  { seasonId: 2, titleId: 'aoe4', seasonIndex: 2, tierId: 'code_b', matchId: 30, round: 5, bestOf: 5, player1Id: 1, player2Id: 2, player1Score: 3, player2Score: 2, winnerId: 1, completedAt: '2026-03-20' },
  // unplayed scheduled meeting — must NOT count
  { seasonId: 2, titleId: 'aoe4', seasonIndex: 2, tierId: 'code_b', matchId: 40, round: 6, bestOf: 3, player1Id: 1, player2Id: 2, player1Score: 0, player2Score: 0, winnerId: null, completedAt: null },
  // different opponent — must NOT bleed into Osiris–Bob
  { seasonId: 1, titleId: 'aoe4', seasonIndex: 1, tierId: 'code_b', matchId: 11, round: 2, bestOf: 3, player1Id: 1, player2Id: 3, player1Score: 2, player2Score: 1, winnerId: 1, completedAt: '2026-01-15' },
];

describe('computeH2H (match grain)', () => {
  it('Osiris(1) vs Bob(2): leads the series, excludes unplayed + other opponents', () => {
    expect(computeH2H(matches, 1, 2)).toEqual({
      perspectivePlayerId: 1, opponentPlayerId: 2,
      matchesPlayed: 3, wins: 2, losses: 1,
      gamesWon: 5, gamesLost: 5,
      lastMeeting: { matchId: 30, won: true, score: [3, 2] },
    });
  });

  it('is perspective-symmetric: Bob(2) vs Osiris(1) is the exact mirror', () => {
    expect(computeH2H(matches, 2, 1)).toEqual({
      perspectivePlayerId: 2, opponentPlayerId: 1,
      matchesPlayed: 3, wins: 1, losses: 2,
      gamesWon: 5, gamesLost: 5,
      lastMeeting: { matchId: 30, won: false, score: [2, 3] },
    });
  });

  it('never met is a zeroed record, not an error (the tournament case)', () => {
    expect(computeH2H(matches, 1, 4)).toEqual({
      perspectivePlayerId: 1, opponentPlayerId: 4,
      matchesPlayed: 0, wins: 0, losses: 0,
      gamesWon: 0, gamesLost: 0, lastMeeting: null,
    });
  });
});

// Reuse the slice-1 games so civ-matchup numbers stay hand-checkable.
const games: EnrichedGame[] = [
  { seasonId: 1, titleId: 'aoe4', tierId: 'code_b', matchId: 10, round: 1, gameNumber: 1, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  { seasonId: 1, titleId: 'aoe4', tierId: 'code_b', matchId: 10, round: 1, gameNumber: 2, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'mongols', mapId: 'black-forest', winnerId: 2 },
  { seasonId: 1, titleId: 'aoe4', tierId: 'code_b', matchId: 10, round: 1, gameNumber: 3, player1Id: 1, player2Id: 2, player1CivId: 'abbasid', player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  // vs Carol — must be filtered out of an Osiris-vs-Bob matchup query
  { seasonId: 1, titleId: 'aoe4', tierId: 'code_b', matchId: 11, round: 2, gameNumber: 2, player1Id: 1, player2Id: 3, player1CivId: 'abbasid', player2CivId: 'delhi',   mapId: 'dry-arabia',   winnerId: 1 },
];

describe('computeCivMatchups (slot re-key)', () => {
  const slots = explodeToSlotViews(games);
  it('Osiris(1) civs vs Bob(2), excluding the Carol game', () => {
    expect(computeCivMatchups(slots, 1, 2)).toEqual([
      { civId: 'abbasid', oppCivId: 'english', played: 1, won: 1, winRate: 1 },
      { civId: 'french',  oppCivId: 'english', played: 1, won: 1, winRate: 1 },
      { civId: 'french',  oppCivId: 'mongols', played: 1, won: 0, winRate: 0 },
    ]);
  });

  it('mirrors from Bob(2) side — same games, opposite outcomes', () => {
    expect(computeCivMatchups(slots, 2, 1)).toEqual([
      { civId: 'mongols', oppCivId: 'french',  played: 1, won: 1, winRate: 1 },
      { civId: 'english', oppCivId: 'abbasid', played: 1, won: 0, winRate: 0 },
      { civId: 'english', oppCivId: 'french',  played: 1, won: 0, winRate: 0 },
    ]);
  });
});
describe('computeMeetings (the match list)', () => {
  it('newest first, decided meetings only, scores from the perspective side', () => {
    expect(computeMeetings(matches, 1, 2)).toEqual([
      { matchId: 30, seasonId: 2, titleId: 'aoe4', seasonIndex: 2, round: 5, bestOf: 5, score: [3, 2], won: true },
      { matchId: 20, seasonId: 2, titleId: 'aoe4', seasonIndex: 2, round: 3, bestOf: 3, score: [0, 2], won: false },
      { matchId: 10, seasonId: 1, titleId: 'aoe4', seasonIndex: 1, round: 1, bestOf: 3, score: [2, 1], won: true },
    ]);
  });

  it('is perspective-symmetric: same meetings, scores swapped, outcomes flipped', () => {
    const fromOsiris = computeMeetings(matches, 1, 2);
    const fromBob = computeMeetings(matches, 2, 1);
    expect(fromBob.map((m) => m.matchId)).toEqual(fromOsiris.map((m) => m.matchId));
    fromBob.forEach((m, i) => {
      const o = fromOsiris[i]!;
      expect(m.score).toEqual([o.score[1], o.score[0]]);
      expect(m.won).toBe(!o.won);
    });
  });

  it('agrees with computeH2H on which meetings count', () => {
    const list = computeMeetings(matches, 1, 2);
    const rec = computeH2H(matches, 1, 2);
    expect(list).toHaveLength(rec.matchesPlayed);
    expect(list[0]!.matchId).toBe(rec.lastMeeting!.matchId);
  });

  it('never met is an empty list', () => {
    expect(computeMeetings(matches, 1, 4)).toEqual([]);
  });

  it('keeps a null best_of rather than guessing', () => {
    const legacy: EnrichedMatch[] = [{ ...matches[0]!, bestOf: null, titleId: null, seasonIndex: null }];
    expect(computeMeetings(legacy, 1, 2)[0]).toMatchObject({ bestOf: null, titleId: null, seasonIndex: null });
  });
});

describe('title scope is a pre-filter', () => {
  // Osiris and Bob also met once in Brood War (season 4 globally, BW season 1).
  const bwMatch: EnrichedMatch = {
    seasonId: 4, titleId: 'bw', seasonIndex: 1, tierId: 'code_s', matchId: 50, round: 2, bestOf: 3,
    player1Id: 1, player2Id: 2, player1Score: 2, player2Score: 0, winnerId: 1, completedAt: null,
  };
  const all = [...matches, bwMatch];
  const aoe4Only = all.filter((m) => m.titleId === 'aoe4');

  it('filtering to one title leaves only that title in the record and the list', () => {
    expect(computeH2H(aoe4Only, 1, 2).matchesPlayed).toBe(3);
    expect(computeMeetings(aoe4Only, 1, 2).every((m) => m.titleId === 'aoe4')).toBe(true);
    expect(computeH2H(all, 1, 2).matchesPlayed).toBe(4);
  });

  it('computeTitleRecords gives one series record per title, most played first', () => {
    expect(computeTitleRecords(all, 1, 2)).toEqual([
      { titleId: 'aoe4', matchesPlayed: 3, wins: 2, losses: 1, lastMatchId: 30 },
      { titleId: 'bw', matchesPlayed: 1, wins: 1, losses: 0, lastMatchId: 50 },
    ]);
  });

  it('computeTitleRecords mirrors from the other side and is empty when they never met', () => {
    expect(computeTitleRecords(all, 2, 1)[1]).toEqual(
      { titleId: 'bw', matchesPlayed: 1, wins: 0, losses: 1, lastMatchId: 50 },
    );
    expect(computeTitleRecords(all, 1, 4)).toEqual([]);
  });
});

describe('computePairGames (the game list)', () => {
  const slots = explodeToSlotViews([
    ...games,
    // a later meeting, so ordering is newest meeting first
    { seasonId: 2, titleId: 'aoe4', tierId: 'code_b', matchId: 30, round: 5, gameNumber: 1, player1Id: 1, player2Id: 2, player1CivId: 'rus', player2CivId: 'english', mapId: null, winnerId: 2 },
  ]);

  it('one row per game from the perspective side, newest meeting first, games in order', () => {
    expect(computePairGames(slots, 1, 2)).toEqual([
      { matchId: 30, gameNumber: 1, mapId: null,           civId: 'rus',     oppCivId: 'english', won: false },
      { matchId: 10, gameNumber: 1, mapId: 'dry-arabia',   civId: 'french',  oppCivId: 'english', won: true },
      { matchId: 10, gameNumber: 2, mapId: 'black-forest', civId: 'french',  oppCivId: 'mongols', won: false },
      { matchId: 10, gameNumber: 3, mapId: 'dry-arabia',   civId: 'abbasid', oppCivId: 'english', won: true },
    ]);
  });

  it('mirrors from the other side and leaves out other opponents', () => {
    const fromBob = computePairGames(slots, 2, 1);
    expect(fromBob).toHaveLength(4);
    expect(fromBob[1]).toEqual({ matchId: 10, gameNumber: 1, mapId: 'dry-arabia', civId: 'english', oppCivId: 'french', won: false });
    expect(computePairGames(slots, 1, 4)).toEqual([]);
  });
});
