import { describe, it, expect } from 'vitest';
import { explodeToSlotViews, type EnrichedGame } from './slots';
import { computeH2H, computeCivMatchups, type EnrichedMatch } from './h2h';

// 1 = Osiris, 2 = Bob, 3 = Carol, 4 = never-played.  player1Id < player2Id throughout.
const matches: EnrichedMatch[] = [
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, player1Id: 1, player2Id: 2, player1Score: 2, player2Score: 1, winnerId: 1, completedAt: '2026-01-10' },
  { seasonId: 2, tierId: 'code_b', matchId: 20, round: 3, player1Id: 1, player2Id: 2, player1Score: 0, player2Score: 2, winnerId: 2, completedAt: '2026-03-05' },
  { seasonId: 2, tierId: 'code_b', matchId: 30, round: 5, player1Id: 1, player2Id: 2, player1Score: 3, player2Score: 2, winnerId: 1, completedAt: '2026-03-20' },
  // unplayed scheduled meeting — must NOT count
  { seasonId: 2, tierId: 'code_b', matchId: 40, round: 6, player1Id: 1, player2Id: 2, player1Score: 0, player2Score: 0, winnerId: null, completedAt: null },
  // different opponent — must NOT bleed into Osiris–Bob
  { seasonId: 1, tierId: 'code_b', matchId: 11, round: 2, player1Id: 1, player2Id: 3, player1Score: 2, player2Score: 1, winnerId: 1, completedAt: '2026-01-15' },
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
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 1, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 2, player1Id: 1, player2Id: 2, player1CivId: 'french',  player2CivId: 'mongols', mapId: 'black-forest', winnerId: 2 },
  { seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 3, player1Id: 1, player2Id: 2, player1CivId: 'abbasid', player2CivId: 'english', mapId: 'dry-arabia',   winnerId: 1 },
  // vs Carol — must be filtered out of an Osiris-vs-Bob matchup query
  { seasonId: 1, tierId: 'code_b', matchId: 11, round: 2, gameNumber: 2, player1Id: 1, player2Id: 3, player1CivId: 'abbasid', player2CivId: 'delhi',   mapId: 'dry-arabia',   winnerId: 1 },
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