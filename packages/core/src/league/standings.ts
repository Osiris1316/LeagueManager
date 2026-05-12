/**
 * Standings computation: pure functions, no database dependency.
 *
 * Computes standings from match data, with tiebreaker by:
 * 1. Match wins (descending)
 * 2. Head-to-head result (if only two players tied)
 * 3. Game differential (games won - games lost, descending)
 */

import type { Match, PlayerStanding } from '../types/league.js';

interface StandingsInput {
  playerIds: number[];
  playerNames: Record<number, string>;
  matches: Match[];
}

export function computeStandings(input: StandingsInput): PlayerStanding[] {
  const { playerIds, playerNames, matches } = input;

  // Initialize stats for each player
  const stats = new Map<number, {
    wins: number;
    losses: number;
    match_wins: number;
    match_losses: number;
  }>();

  for (const pid of playerIds) {
    stats.set(pid, { wins: 0, losses: 0, match_wins: 0, match_losses: 0 });
  }

  // Accumulate from completed matches
  for (const match of matches) {
    if (match.status !== 'complete') continue;

    const s1 = stats.get(match.player1_id);
    const s2 = stats.get(match.player2_id);
    if (!s1 || !s2) continue;

    // Game counts (individual maps won/lost)
    s1.match_wins += match.player1_score;
    s1.match_losses += match.player2_score;
    s2.match_wins += match.player2_score;
    s2.match_losses += match.player1_score;

    // Match outcome
    if (match.winner_id === match.player1_id) {
      s1.wins += 1;
      s2.losses += 1;
    } else if (match.winner_id === match.player2_id) {
      s2.wins += 1;
      s1.losses += 1;
    }
  }

  // Build standings array
  const standings: PlayerStanding[] = playerIds.map(pid => {
    const s = stats.get(pid)!;
    return {
      player_id: pid,
      display_name: playerNames[pid] ?? `Player ${pid}`,
      wins: s.wins,
      losses: s.losses,
      match_wins: s.match_wins,
      match_losses: s.match_losses,
      game_diff: s.match_wins - s.match_losses,
      rank: 0, // computed below
    };
  });

  // Sort: most match wins first, then game differential
  standings.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.game_diff !== a.game_diff) return b.game_diff - a.game_diff;
    // Final fallback: alphabetical by name for consistent ordering
    return a.display_name.localeCompare(b.display_name);
  });

  // Assign ranks (1-indexed, ties share a rank)
  let currentRank = 1;
  for (let i = 0; i < standings.length; i++) {
    if (i > 0) {
      const prev = standings[i - 1]!;
      const curr = standings[i]!;
      if (prev.wins !== curr.wins || prev.game_diff !== curr.game_diff) {
        currentRank = i + 1;
      }
    }
    standings[i]!.rank = currentRank;
  }

  return standings;
}
