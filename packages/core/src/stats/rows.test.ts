import { describe, it, expect } from 'vitest';
import { rowToEnrichedGame, rowToEnrichedMatch } from './rows';
import { explodeToSlotViews } from './slots';
import { computeH2H } from './h2h';

describe('rowToEnrichedGame', () => {
  it('maps snake_case → camelCase for a full row', () => {
    const row = {
      season_id: 1, tier_id: 'code_b', match_id: 10, round: 1, game_number: 3,
      player1_id: 1, player2_id: 2,
      player1_civ_id: 'french', player2_civ_id: 'english',
      map_id: 'dry-arabia', winner_id: 1,
    };
    expect(rowToEnrichedGame(row)).toEqual({
      seasonId: 1, tierId: 'code_b', matchId: 10, round: 1, gameNumber: 3,
      player1Id: 1, player2Id: 2,
      player1CivId: 'french', player2CivId: 'english',
      mapId: 'dry-arabia', winnerId: 1,
    });
  });

  it('preserves nulls — never coerces to 0 or empty string', () => {
    const row = {
      season_id: 1, tier_id: 'code_b', match_id: 12, round: null, game_number: 1,
      player1_id: 1, player2_id: 2,
      player1_civ_id: null, player2_civ_id: 'mongols',
      map_id: null, winner_id: null,
    };
    const g = rowToEnrichedGame(row);
    expect(g.round).toBeNull();
    expect(g.player1CivId).toBeNull();
    expect(g.mapId).toBeNull();
    expect(g.winnerId).toBeNull();
  });
});

describe('rowToEnrichedMatch', () => {
  it('maps a completed match row', () => {
    const row = {
      season_id: 2, tier_id: 'code_b', match_id: 30, round: 5,
      player1_id: 1, player2_id: 2, player1_score: 3, player2_score: 2,
      winner_id: 1, completed_at: '2026-03-20',
    };
    expect(rowToEnrichedMatch(row)).toEqual({
      seasonId: 2, tierId: 'code_b', matchId: 30, round: 5,
      player1Id: 1, player2Id: 2, player1Score: 3, player2Score: 2,
      winnerId: 1, completedAt: '2026-03-20',
    });
  });

  it('preserves nulls on an unplayed match (round + winner + completed_at)', () => {
    const row = {
      season_id: 2, tier_id: 'code_b', match_id: 40, round: null,
      player1_id: 1, player2_id: 2, player1_score: 0, player2_score: 0,
      winner_id: null, completed_at: null,
    };
    const m = rowToEnrichedMatch(row);
    expect(m.round).toBeNull();
    expect(m.winnerId).toBeNull();
    expect(m.completedAt).toBeNull();
  });
});

describe('mapper output is fold-compatible', () => {
  it('mapped game rows explode to slots correctly', () => {
    const rows = [
      { season_id: 1, tier_id: 'code_b', match_id: 10, round: 1, game_number: 1, player1_id: 1, player2_id: 2, player1_civ_id: 'french', player2_civ_id: 'english', map_id: 'dry-arabia', winner_id: 1 },
      { season_id: 1, tier_id: 'code_b', match_id: 10, round: 1, game_number: 2, player1_id: 1, player2_id: 2, player1_civ_id: 'french', player2_civ_id: 'mongols', map_id: 'black-forest', winner_id: 2 },
    ];
    expect(explodeToSlotViews(rows.map(rowToEnrichedGame))).toHaveLength(4); // 2 games × 2 sides
  });

  it('a null-winner match row is excluded by the H2H fold', () => {
    const rows = [
      { season_id: 1, tier_id: 'code_b', match_id: 10, round: 1, player1_id: 1, player2_id: 2, player1_score: 2, player2_score: 1, winner_id: 1, completed_at: '2026-01-10' },
      { season_id: 2, tier_id: 'code_b', match_id: 40, round: null, player1_id: 1, player2_id: 2, player1_score: 0, player2_score: 0, winner_id: null, completed_at: null },
    ];
    const h2h = computeH2H(rows.map(rowToEnrichedMatch), 1, 2);
    expect(h2h.matchesPlayed).toBe(1); // only match 10; the null-winner row 40 dropped
  });
});