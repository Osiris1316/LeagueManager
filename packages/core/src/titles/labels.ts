import { titleById } from './catalog.js';

/**
 * Display labels for a season.
 *
 * Both helpers tolerate a missing title id or index: a database that predates
 * the season_titles migration has no `title_id` column, and the API passes
 * through whatever columns exist. Degrade to a plain season label rather than
 * rendering "Season undefined".
 */
export function seasonLabel(titleId: string, seasonIndex: number): string {
  const title = titleId ? titleById(titleId) : null;
  const label = Number.isFinite(seasonIndex) ? `Season ${seasonIndex}` : 'Season';
  return title ? `${title.name} - ${label}` : label;
}

export function seasonLabelShort(titleId: string, seasonIndex: number): string {
  const title = titleId ? titleById(titleId) : null;
  const label = Number.isFinite(seasonIndex) ? `S${seasonIndex}` : 'S?';
  return title ? `${title.shortName} ${label}` : label;
}

/** The `seasons.format` value for a one-off event (group stage plus bracket). */
export const EVENT_FORMAT = 'tournament';

/** The season fields the name helpers need. Structural, so web and API rows both fit. */
export interface SeasonNaming {
  title_id: string;
  season_index: number;
  format?: string | null;
  name?: string | null;
}

/** A one-off event rather than a league season. */
export function isEventSeason(season: { format?: string | null }): boolean {
  return season.format === EVENT_FORMAT;
}

/** "Age of Empires IV - Season 4", or an event's own name. */
export function seasonName(season: SeasonNaming): string {
  return isEventSeason(season) && season.name
    ? season.name
    : seasonLabel(season.title_id, season.season_index);
}

/** "AoE4 S4", or an event's own name. */
export function seasonNameShort(season: SeasonNaming): string {
  return isEventSeason(season) && season.name
    ? season.name
    : seasonLabelShort(season.title_id, season.season_index);
}
