import type { MatchStatus } from '../types/league.js';

export interface MatchOutcomeInput {
  best_of: number;
  player1_id: number;
  player2_id: number;
  /** One entry per game that has been played; winner_id is the player who won it. */
  games: { winner_id: number | null }[];
}

export interface MatchOutcome {
  player1_score: number;
  player2_score: number;
  winner_id: number | null;
  status: MatchStatus;
}

/**
 * Pure derivation of a match's outcome from its game results.
 * Used by the admin report path today and the wizard's per-step commits later.
 */
export function computeMatchOutcome(input: MatchOutcomeInput): MatchOutcome {
  const winsNeeded = Math.ceil(input.best_of / 2);

  let player1_score = 0;
  let player2_score = 0;
  for (const g of input.games) {
    if (g.winner_id === input.player1_id) player1_score++;
    else if (g.winner_id === input.player2_id) player2_score++;
  }

  let winner_id: number | null = null;
  if (player1_score >= winsNeeded) winner_id = input.player1_id;
  else if (player2_score >= winsNeeded) winner_id = input.player2_id;

  const anyPlayed = player1_score + player2_score > 0;
  const status: MatchStatus = winner_id ? 'complete' : anyPlayed ? 'in_progress' : 'pending';

  return { player1_score, player2_score, winner_id, status };
}