/**
 * Round-robin scheduling using the circle method.
 *
 * For N players, generates N-1 rounds (or N rounds if N is odd, with one bye per round).
 * Each pair meets exactly once. Player IDs in each pairing are always ordered low < high
 * to match the matches table CHECK constraint.
 */

import type { Round, RoundPairing } from '../types/league.js';

/**
 * Generate a full round-robin schedule for a list of player IDs.
 *
 * @param playerIds - Array of player IDs in the tier
 * @returns Array of rounds with pairings and optional bye
 */
export function generateRoundRobin(playerIds: number[]): Round[] {
  if (playerIds.length < 2) {
    return [];
  }

  // Copy to avoid mutating input
  const ids = [...playerIds];

  // If odd number of players, add a sentinel for the bye slot
  const BYE_SENTINEL = -1;
  if (ids.length % 2 !== 0) {
    ids.push(BYE_SENTINEL);
  }

  const n = ids.length;
  const totalRounds = n - 1;
  const rounds: Round[] = [];

  // Circle method: fix position 0, rotate the rest
  // positions[0] is fixed; positions[1..n-1] rotate each round
  const positions = [...ids];

  for (let round = 0; round < totalRounds; round++) {
    const pairings: RoundPairing[] = [];
    let byePlayerId: number | undefined;

    for (let i = 0; i < n / 2; i++) {
      const a = positions[i]!;
      const b = positions[n - 1 - i]!;

      if (a === BYE_SENTINEL) {
        byePlayerId = b;
      } else if (b === BYE_SENTINEL) {
        byePlayerId = a;
      } else {
        // Enforce low < high ordering
        const low = Math.min(a, b);
        const high = Math.max(a, b);
        pairings.push({ player1_id: low, player2_id: high });
      }
    }

    rounds.push({
      round_number: round + 1,
      pairings,
      ...(byePlayerId !== undefined ? { bye_player_id: byePlayerId } : {}),
    });

    // Rotate: keep positions[0] fixed, shift positions[1..n-1]
    // Move last element to position 1, shift everything else right
    const last = positions.pop()!;
    positions.splice(1, 0, last);
  }

  return rounds;
}
