import type { SlotView } from './slots';

/**
 * One match, ready for a match-grain fold. Produced by the fetch layer.
 * player1Id < player2Id (the table's CHECK), so a fixed player is on a fixed
 * side within a pair — which is exactly why the fold must normalize to a
 * chosen perspective rather than trusting slot order.
 */
export interface EnrichedMatch {
  seasonId: number;
  tierId: string;
  matchId: number;
  round: number | null;
  player1Id: number;
  player2Id: number;
  player1Score: number;
  player2Score: number;
  winnerId: number | null; // null = unplayed/void — excluded from the record
  completedAt: string | null;
}

export interface H2HRecord {
  perspectivePlayerId: number;
  opponentPlayerId: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  gamesWon: number; // series games, summed from the perspective player's side
  gamesLost: number;
  lastMeeting: { matchId: number; won: boolean; score: [number, number] } | null;
}

/**
 * Head-to-head series record between an ordered pair, from perspectivePlayer's
 * side. Cross-season and cross-tier by default — scope by pre-filtering the
 * input array, never via a parameter. Never met = a zeroed record, not an error
 * (the one-day-tournament case). "Last" is structural (season → round → match),
 * not by timestamp, since completedAt may be sparse.
 */
export function computeH2H(
  matches: EnrichedMatch[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): H2HRecord {
  const rec: H2HRecord = {
    perspectivePlayerId,
    opponentPlayerId,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    gamesWon: 0,
    gamesLost: 0,
    lastMeeting: null,
  };

  const meetings = matches.filter((m) => {
    const isPair =
      (m.player1Id === perspectivePlayerId && m.player2Id === opponentPlayerId) ||
      (m.player1Id === opponentPlayerId && m.player2Id === perspectivePlayerId);
    return isPair && (m.winnerId === perspectivePlayerId || m.winnerId === opponentPlayerId);
  });

  if (meetings.length === 0) return rec; // never met — a value, not an error

  meetings.sort(
    (a, b) =>
      a.seasonId - b.seasonId ||
      (a.round ?? 0) - (b.round ?? 0) ||
      a.matchId - b.matchId,
  );

  for (const m of meetings) {
    const perspIsP1 = m.player1Id === perspectivePlayerId;
    const perspScore = perspIsP1 ? m.player1Score : m.player2Score;
    const oppScore = perspIsP1 ? m.player2Score : m.player1Score;

    rec.matchesPlayed += 1;
    rec.gamesWon += perspScore;
    rec.gamesLost += oppScore;
    if (m.winnerId === perspectivePlayerId) rec.wins += 1;
    else rec.losses += 1;
  }

   const last = meetings[meetings.length - 1];
  if (last) {
    const perspIsP1 = last.player1Id === perspectivePlayerId;
    rec.lastMeeting = {
      matchId: last.matchId,
      won: last.winnerId === perspectivePlayerId,
      score: perspIsP1
        ? [last.player1Score, last.player2Score]
        : [last.player2Score, last.player1Score],
    };
  }

  return rec;
}

export interface CivMatchupRecord {
  civId: string;
  oppCivId: string;
  played: number;
  won: number;
  winRate: number; // 0..1
}

/**
 * Civ-vs-civ record for a pair, from perspectivePlayer's side — the SlotView
 * primitive re-keyed by (civId, oppCivId). Deliberately separate from
 * computeH2H: series record is match-grain, this is slot-grain; different
 * return types, no shared object (compose them at the surface if wanted).
 * Slots with a null civ on either side are skipped (can't attribute a matchup).
 */
export function computeCivMatchups(
  slots: SlotView[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): CivMatchupRecord[] {
  const acc = new Map<string, { civId: string; oppCivId: string; played: number; won: number }>();
  for (const s of slots) {
    if (s.playerId !== perspectivePlayerId || s.oppPlayerId !== opponentPlayerId) continue;
    if (s.civId === null || s.oppCivId === null) continue;
    const key = `${s.civId}\u0000${s.oppCivId}`; // NUL delimiter: civ ids never contain it; never parsed back
    const cur = acc.get(key) ?? { civId: s.civId, oppCivId: s.oppCivId, played: 0, won: 0 };
    cur.played += 1;
    if (s.won) cur.won += 1;
    acc.set(key, cur);
  }

  const rows: CivMatchupRecord[] = [];
  for (const { civId, oppCivId, played, won } of acc.values()) {
    rows.push({ civId, oppCivId, played, won, winRate: played === 0 ? 0 : won / played });
  }
  rows.sort(
    (a, b) =>
      b.played - a.played ||
      b.winRate - a.winRate ||
      a.civId.localeCompare(b.civId) ||
      a.oppCivId.localeCompare(b.oppCivId),
  );
  return rows;
}