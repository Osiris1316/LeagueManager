import type { SlotView } from './slots';

/**
 * One match, ready for a match-grain fold. Produced by the fetch layer.
 * player1Id < player2Id (the table's CHECK), so a fixed player is on a fixed
 * side within a pair — which is exactly why the fold must normalize to a
 * chosen perspective rather than trusting slot order.
 */
export interface EnrichedMatch {
  seasonId: number;
  /** The season's game title ('aoe4', 'bw'); null where the query didn't select it. */
  titleId: string | null;
  /** Season number within its title (AoE4 Season 3 → 3); null if not selected. */
  seasonIndex: number | null;
  tierId: string;
  matchId: number;
  round: number | null;
  bestOf: number | null;
  player1Id: number;
  player2Id: number;
  player1Score: number;
  player2Score: number;
  winnerId: number | null; // null = unplayed/void — excluded from the record
  completedAt: string | null;
}

/**
 * The pair's decided matches, oldest first in structural order
 * (season → round → match), not by timestamp, since completedAt may be sparse.
 * Shared by every match-grain view below so they can never disagree about
 * which meetings count.
 */
function decidedMeetings(
  matches: EnrichedMatch[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): EnrichedMatch[] {
  return matches
    .filter((m) => {
      const isPair =
        (m.player1Id === perspectivePlayerId && m.player2Id === opponentPlayerId) ||
        (m.player1Id === opponentPlayerId && m.player2Id === perspectivePlayerId);
      return isPair && (m.winnerId === perspectivePlayerId || m.winnerId === opponentPlayerId);
    })
    .sort(
      (a, b) =>
        a.seasonId - b.seasonId ||
        (a.round ?? 0) - (b.round ?? 0) ||
        a.matchId - b.matchId,
    );
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

  const meetings = decidedMeetings(matches, perspectivePlayerId, opponentPlayerId);

  if (meetings.length === 0) return rec; // never met — a value, not an error

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
/** One past meeting of the pair, seen from the perspective player's side. */
export interface H2HMeeting {
  matchId: number;
  seasonId: number;
  titleId: string | null;
  seasonIndex: number | null;
  round: number | null;
  bestOf: number | null;
  /** [perspective player's games, opponent's games]. */
  score: [number, number];
  won: boolean;
}

/**
 * Every decided meeting of the pair, newest first, scores normalized to the
 * perspective player. The list behind "3–2, S3 · R2 · Bo5" rows; same
 * meetings computeH2H counts. Scope (one game title, one season) is a
 * pre-filter on `matches`, never a parameter.
 */
export function computeMeetings(
  matches: EnrichedMatch[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): H2HMeeting[] {
  return decidedMeetings(matches, perspectivePlayerId, opponentPlayerId)
    .reverse()
    .map((m) => {
      const perspIsP1 = m.player1Id === perspectivePlayerId;
      return {
        matchId: m.matchId,
        seasonId: m.seasonId,
        titleId: m.titleId,
        seasonIndex: m.seasonIndex,
        round: m.round,
        bestOf: m.bestOf,
        score: perspIsP1 ? [m.player1Score, m.player2Score] : [m.player2Score, m.player1Score],
        won: m.winnerId === perspectivePlayerId,
      };
    });
}

/** One game between the pair, from the perspective player's side. */
export interface H2HGame {
  matchId: number;
  gameNumber: number;
  mapId: string | null;
  civId: string | null;
  oppCivId: string | null;
  won: boolean;
}

/**
 * Every game between the pair from the perspective player's side: the pair's
 * slots, keeping only the perspective side so each game appears once. Newest
 * meeting first, games in play order within a meeting, so a client can group
 * by matchId without re-sorting. Scope by pre-filtering what feeds `slots`.
 */
export function computePairGames(
  slots: SlotView[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): H2HGame[] {
  return slots
    .filter((s) => s.playerId === perspectivePlayerId && s.oppPlayerId === opponentPlayerId)
    .sort(
      (a, b) =>
        b.seasonId - a.seasonId ||
        (b.round ?? 0) - (a.round ?? 0) ||
        b.matchId - a.matchId ||
        a.gameNumber - b.gameNumber,
    )
    .map((s) => ({
      matchId: s.matchId,
      gameNumber: s.gameNumber,
      mapId: s.mapId,
      civId: s.civId,
      oppCivId: s.oppCivId,
      won: s.won,
    }));
}

/** The pair's series record within one game title. */
export interface TitleSeriesRecord {
  titleId: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  /** The most recent meeting in this title, for linking to it. */
  lastMatchId: number;
}

/**
 * The pair's series record per game title, from the perspective player's
 * side: the "Brood War 1–0" beside an AoE4 head-to-head. Each title is a
 * pre-filter of `matches` folded by computeH2H, so the numbers can't drift
 * from the main record. Titles they never met in, and matches with no title,
 * are left out. Most-played title first.
 */
export function computeTitleRecords(
  matches: EnrichedMatch[],
  perspectivePlayerId: number,
  opponentPlayerId: number,
): TitleSeriesRecord[] {
  const titleIds = new Set<string>();
  for (const m of matches) if (m.titleId !== null) titleIds.add(m.titleId);

  const records: TitleSeriesRecord[] = [];
  for (const titleId of titleIds) {
    const inTitle = matches.filter((m) => m.titleId === titleId);
    const rec = computeH2H(inTitle, perspectivePlayerId, opponentPlayerId);
    if (rec.matchesPlayed === 0 || rec.lastMeeting === null) continue;
    records.push({
      titleId,
      matchesPlayed: rec.matchesPlayed,
      wins: rec.wins,
      losses: rec.losses,
      lastMatchId: rec.lastMeeting.matchId,
    });
  }
  records.sort((a, b) => b.matchesPlayed - a.matchesPlayed || a.titleId.localeCompare(b.titleId));
  return records;
}
