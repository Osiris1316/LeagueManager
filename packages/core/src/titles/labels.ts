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
