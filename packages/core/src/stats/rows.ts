import type { EnrichedGame } from './slots';
import type { EnrichedMatch } from './h2h';

/**
 * Map D1 result rows into the enriched shapes the folds consume.
 *
 * These are pure (plain object → plain object) so they live in core and get
 * unit-tested here, even though the rows originate from D1. The queries that
 * feed them must alias columns to these exact keys — matches.id AS match_id,
 * round_number AS round — so the mapper only camelCases and types; it never
 * has to know a column's original name.
 *
 * Null preservation is load-bearing: winner_id, the civ ids, map_id, round and
 * completed_at are all legitimately null, and the folds depend on null to skip
 * (unattributable civ/map) or exclude (undecided match). Never coerce null to
 * 0 or '' here — that would silently corrupt every denominator downstream.
 */

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v);
}
function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : num(v);
}
function str(v: unknown): string {
  return typeof v === 'string' ? v : String(v);
}
function strOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : str(v);
}

/** Expects a row aliased to: season_id, tier_id, match_id, round, game_number,
 *  player1_id, player2_id, player1_civ_id, player2_civ_id, map_id, winner_id. */
export function rowToEnrichedGame(row: Record<string, unknown>): EnrichedGame {
  return {
    seasonId: num(row.season_id),
    tierId: str(row.tier_id),
    matchId: num(row.match_id),
    round: numOrNull(row.round),
    gameNumber: num(row.game_number),
    player1Id: num(row.player1_id),
    player2Id: num(row.player2_id),
    player1CivId: strOrNull(row.player1_civ_id),
    player2CivId: strOrNull(row.player2_civ_id),
    mapId: strOrNull(row.map_id),
    winnerId: numOrNull(row.winner_id),
  };
}

/** Expects a row aliased to: season_id, tier_id, match_id, round,
 *  player1_id, player2_id, player1_score, player2_score, winner_id, completed_at. */
export function rowToEnrichedMatch(row: Record<string, unknown>): EnrichedMatch {
  return {
    seasonId: num(row.season_id),
    tierId: str(row.tier_id),
    matchId: num(row.match_id),
    round: numOrNull(row.round),
    player1Id: num(row.player1_id),
    player2Id: num(row.player2_id),
    player1Score: num(row.player1_score),
    player2Score: num(row.player2_score),
    winnerId: numOrNull(row.winner_id),
    completedAt: strOrNull(row.completed_at),
  };
}