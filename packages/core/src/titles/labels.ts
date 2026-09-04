import { titleById } from './catalog.js';

export function seasonLabel(titleId: string, seasonIndex: number): string {
  const title = titleById(titleId);
  return title
    ? `${title.name} - Season ${seasonIndex}`
    : `Season ${seasonIndex}`;
}

export function seasonLabelShort(titleId: string, seasonIndex: number): string {
  const title = titleById(titleId);
  return title
    ? `${title.shortName} S${seasonIndex}`
    : `S${seasonIndex}`;
}