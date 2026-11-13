/**
 * Standings computation: pure functions, no database dependency.
 *
 * Computes standings from match data. Two tiebreak rules:
 *
 * 'game_diff' (leagues, the default): match wins, then game differential
 * (games won - games lost), then name for a stable order. Players level on
 * both share a rank.
 *
 * 'head_to_head' (events, where every match is a Bo1 and game differential
 * says nothing new): match wins, then wins in the matches between the tied
 * players only, applied again inside any group that is still level. A group
 * that head to head can't split (a three-way circle, or matches not played
 * yet) shares a rank, listed by name.
 */

import type { Match, PlayerStanding } from '../types/league.js';

export type StandingsTiebreak = 'game_diff' | 'head_to_head';

interface StandingsInput {
  playerIds: number[];
  playerNames: Record<number, string>;
  matches: Match[];
  /** Defaults to 'game_diff'. */
  tiebreak?: StandingsTiebreak;
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

  if (input.tiebreak === 'head_to_head') {
    return rankByHeadToHead(standings, matches);
  }

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

/** Match wins each player has in completed matches between members of the group. */
function headToHeadWins(group: PlayerStanding[], matches: Match[]): Map<number, number> {
  const ids = new Set(group.map(s => s.player_id));
  const wins = new Map<number, number>(group.map(s => [s.player_id, 0]));
  for (const m of matches) {
    if (m.status !== 'complete' || m.winner_id == null) continue;
    if (!ids.has(m.player1_id) || !ids.has(m.player2_id)) continue;
    wins.set(m.winner_id, (wins.get(m.winner_id) ?? 0) + 1);
  }
  return wins;
}

/** Splits an already sorted list into runs that share a key. */
function runsBy<T>(items: T[], key: (item: T) => number): T[][] {
  const runs: T[][] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (last && key(last[0]!) === key(item)) last.push(item);
    else runs.push([item]);
  }
  return runs;
}

/**
 * Orders one group of players level on match wins. Returns groups in final
 * order; a group with more than one player is a tie head to head can't break.
 */
function breakTie(group: PlayerStanding[], matches: Match[]): PlayerStanding[][] {
  const byName = (a: PlayerStanding, b: PlayerStanding) => a.display_name.localeCompare(b.display_name);
  if (group.length === 1) return [group];

  const h2h = headToHeadWins(group, matches);
  const sorted = [...group].sort((a, b) => (h2h.get(b.player_id)! - h2h.get(a.player_id)!) || byName(a, b));
  const runs = runsBy(sorted, s => h2h.get(s.player_id)!);

  // Head to head didn't separate anyone: an unbreakable tie.
  if (runs.length === 1) return [sorted];

  // Otherwise apply it again inside each smaller group still level.
  return runs.flatMap(run => breakTie(run, matches));
}

function rankByHeadToHead(standings: PlayerStanding[], matches: Match[]): PlayerStanding[] {
  const byWins = [...standings].sort((a, b) =>
    (b.wins - a.wins) || a.display_name.localeCompare(b.display_name));

  const ordered = runsBy(byWins, s => s.wins).flatMap(group => breakTie(group, matches));

  const result: PlayerStanding[] = [];
  let position = 1;
  for (const group of ordered) {
    for (const s of group) result.push({ ...s, rank: position });
    position += group.length;
  }
  return result;
}

export interface GroupSeeding {
  /** Seed number → player id, when every seed is settled. */
  seeds: Map<number, number> | null;
  /** Why there are no seeds yet. */
  reason: 'group_unfinished' | 'tie' | null;
  /** Ranks shared by more than one player, when reason is 'tie'. */
  tiedRanks: number[];
}

/**
 * Seeds for a playoff bracket from a head-to-head ranked group stage. Only
 * once every group match is complete, and only when no rank is shared.
 */
export function seedsFromStandings(standings: PlayerStanding[], matches: Match[]): GroupSeeding {
  if (matches.some(m => m.status !== 'complete')) {
    return { seeds: null, reason: 'group_unfinished', tiedRanks: [] };
  }
  const counts = new Map<number, number>();
  for (const s of standings) counts.set(s.rank, (counts.get(s.rank) ?? 0) + 1);
  const tiedRanks = [...counts].filter(([, n]) => n > 1).map(([rank]) => rank).sort((a, b) => a - b);
  if (tiedRanks.length > 0) return { seeds: null, reason: 'tie', tiedRanks };

  const seeds = new Map<number, number>();
  for (const s of standings) seeds.set(s.rank, s.player_id);
  return { seeds, reason: null, tiedRanks: [] };
}
