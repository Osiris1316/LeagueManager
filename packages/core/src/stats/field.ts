import type { EnrichedMatch } from './h2h';
import { computeCivStats, type KeyedRecord, type SlotView } from './slots';

/** One player's record against everyone: the Versus page's corners. */
export interface FieldRecord {
  playerId: number;
  matches: { won: number; lost: number };
  /** Summed from match scores, the same source as the head-to-head games record. */
  games: { won: number; lost: number };
  /** Latest decided matches, newest first. */
  form: ('W' | 'L')[];
  /** Most played civs (or races) with records, most played first. */
  civs: KeyedRecord[];
}

/**
 * A player's record against the whole field. Same rules as the head-to-head
 * folds: decided matches only (winner is one of the two players), games from
 * the official match scores, "latest" in structural order (season → round →
 * match), civs from the game slots. Scope (one title, since a season) is a
 * pre-filter on `matches` and `slots`, never a parameter.
 */
export function computeFieldRecord(
  matches: EnrichedMatch[],
  slots: SlotView[],
  playerId: number,
  { formLength = 5, civLimit = 5 }: { formLength?: number; civLimit?: number } = {},
): FieldRecord {
  const decided = matches
    .filter((m) =>
      (m.player1Id === playerId || m.player2Id === playerId) &&
      (m.winnerId === m.player1Id || m.winnerId === m.player2Id))
    .sort((a, b) => b.seasonId - a.seasonId || (b.round ?? 0) - (a.round ?? 0) || b.matchId - a.matchId);

  const rec: FieldRecord = {
    playerId,
    matches: { won: 0, lost: 0 },
    games: { won: 0, lost: 0 },
    form: [],
    civs: computeCivStats(slots, playerId).slice(0, civLimit),
  };

  for (const m of decided) {
    const isP1 = m.player1Id === playerId;
    const won = m.winnerId === playerId;
    if (won) rec.matches.won += 1; else rec.matches.lost += 1;
    rec.games.won += isP1 ? m.player1Score : m.player2Score;
    rec.games.lost += isP1 ? m.player2Score : m.player1Score;
    if (rec.form.length < formLength) rec.form.push(won ? 'W' : 'L');
  }

  return rec;
}
