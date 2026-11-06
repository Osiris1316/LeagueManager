/**
 * Match queue: which of a player's unplayed matches are overdue, due this
 * round, or coming up later. Pure functions, no database or clock access; the
 * caller passes `now`, which keeps this testable and deterministic.
 *
 * Round timing rule (v1): round 1 opens on the season's start date and each
 * later round opens one week after the previous one. Round N is open from
 * start + (N - 1) weeks until start + N weeks. Per-tier round dates are on
 * the backlog; when they land, only `roundWindow` needs to learn about them.
 *
 * Dates are read as local calendar days (a season starting "2026-10-29" opens
 * at local midnight on Oct 29), matching how the league talks about rounds.
 */

export const ROUND_LENGTH_DAYS = 7;

/** Where a match sits relative to today. */
export type QueueGroup = 'overdue' | 'current' | 'upcoming';

/** The season fields the queue needs. Structural, so web and API rows both fit. */
export interface QueueSeason {
  id: number;
  status: string;
  started_at: string | null;
}

/** The match fields the queue needs. */
export interface QueueMatch {
  id: number;
  season_id: number;
  round_number: number | null;
  status: string;
  scheduled_at?: string | null;
}

export interface MatchQueue<M> {
  /** Rounds that have already closed, oldest first. */
  overdue: M[];
  /** Rounds open right now, scheduled matches first. */
  current: M[];
  /** Rounds that haven't opened yet, soonest first. */
  upcoming: M[];
}

export interface RoundWindow {
  opens: Date;
  closes: Date;
}

/** Parses "YYYY-MM-DD" (or a datetime starting with it) as local midnight. */
function parseLocalDay(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * The window during which a round is open, or null when the season has no
 * usable start date or the round number is missing.
 */
export function roundWindow(startedAt: string | null, round: number | null): RoundWindow | null {
  if (!startedAt || round == null || round < 1) return null;
  const start = parseLocalDay(startedAt);
  if (!start) return null;
  const opens = addDays(start, (round - 1) * ROUND_LENGTH_DAYS);
  return { opens, closes: addDays(opens, ROUND_LENGTH_DAYS) };
}

/**
 * Places one match. A match we can't place in time (no start date, no round)
 * counts as current: from a player's point of view it is playable now.
 */
export function queueGroupFor(window: RoundWindow | null, now: Date): QueueGroup {
  if (!window) return 'current';
  if (now.getTime() >= window.closes.getTime()) return 'overdue';
  if (now.getTime() < window.opens.getTime()) return 'upcoming';
  return 'current';
}

function scheduledTime(m: QueueMatch): number {
  if (!m.scheduled_at) return Number.POSITIVE_INFINITY;
  const t = Date.parse(m.scheduled_at);
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

/**
 * Sorts a player's matches into the three groups. Only unplayed matches in
 * active seasons are included: pending seasons are not public yet and
 * finished seasons are history.
 */
export function groupMatchQueue<M extends QueueMatch>(
  matches: readonly M[],
  seasons: readonly QueueSeason[],
  now: Date,
): MatchQueue<M> {
  const activeSeasons = new Map(
    seasons.filter(s => s.status === 'active').map(s => [s.id, s]),
  );

  type Placed = { match: M; opens: number };
  const groups: Record<QueueGroup, Placed[]> = { overdue: [], current: [], upcoming: [] };

  for (const match of matches) {
    if (match.status === 'complete') continue;
    const season = activeSeasons.get(match.season_id);
    if (!season) continue;
    const window = roundWindow(season.started_at, match.round_number);
    groups[queueGroupFor(window, now)].push({
      match,
      opens: window ? window.opens.getTime() : Number.NEGATIVE_INFINITY,
    });
  }

  // Overdue and upcoming read best in round-date order across leagues;
  // within this round, a match with a set time comes before one without.
  const byOpens = (a: Placed, b: Placed) =>
    a.opens - b.opens || scheduledTime(a.match) - scheduledTime(b.match) || a.match.id - b.match.id;
  const bySchedule = (a: Placed, b: Placed) =>
    scheduledTime(a.match) - scheduledTime(b.match) || a.opens - b.opens || a.match.id - b.match.id;

  return {
    overdue: groups.overdue.sort(byOpens).map(p => p.match),
    current: groups.current.sort(bySchedule).map(p => p.match),
    upcoming: groups.upcoming.sort(byOpens).map(p => p.match),
  };
}
