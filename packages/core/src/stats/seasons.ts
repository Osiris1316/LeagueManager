/**
 * Season order and "since" scope, shared by the API and the web so the
 * Since list and the numbers behind it always agree on which events count.
 */

/** The fields of a season this needs, from either the API or the web. */
export interface SeasonOrderRow {
  id: number;
  /** ISO date (or datetime); null for a season that hasn't started. */
  startedAt: string | null;
  /** The global running number (seasons.season_number). */
  seasonNumber: number;
}

/**
 * Season ids oldest → newest: by start date, then by season number, then
 * id. Seasons with no start date go last (they haven't started). Showmatches
 * and other events are seasons too, so they fall into place by date.
 */
export function orderSeasonsChronologically(rows: SeasonOrderRow[]): number[] {
  return [...rows]
    .sort((a, b) => {
      if (a.startedAt !== b.startedAt) {
        if (a.startedAt === null) return 1;
        if (b.startedAt === null) return -1;
        const byDate = a.startedAt.slice(0, 10).localeCompare(b.startedAt.slice(0, 10));
        if (byDate !== 0) return byDate;
      }
      return a.seasonNumber - b.seasonNumber || a.id - b.id;
    })
    .map((r) => r.id);
}

/**
 * The season ids from `sinceSeasonId` onward in an oldest → newest list.
 * null means no limit: either no "since" was asked for, or the id isn't in
 * the list (an unknown selection never over-filters, as with
 * filterSlotsByScope). Use it as a pre-filter on matches and games.
 */
export function seasonIdsSince(orderedSeasonIds: number[], sinceSeasonId: number | null): Set<number> | null {
  if (sinceSeasonId === null) return null;
  const start = orderedSeasonIds.indexOf(sinceSeasonId);
  if (start === -1) return null;
  return new Set(orderedSeasonIds.slice(start));
}
