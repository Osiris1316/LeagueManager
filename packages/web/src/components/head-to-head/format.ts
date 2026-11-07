import type { H2HMeeting } from '@league-manager/core';
import { MAPS } from '../../data/aoe4';
import type { H2HGameRow } from '../../api/client';

/** "S3 · R2 · Bo5", leaving out any part the data doesn't have. */
export function meetingTag(m: H2HMeeting): string {
  return [
    m.seasonIndex !== null ? `S${m.seasonIndex}` : null,
    m.round !== null ? `R${m.round}` : null,
    m.bestOf !== null ? `Bo${m.bestOf}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** What a screen reader hears for a meeting's link. */
export function meetingLabel(m: H2HMeeting, leftName: string, rightName: string): string {
  const when = [
    m.seasonIndex !== null ? `Season ${m.seasonIndex}` : null,
    m.round !== null ? `Round ${m.round}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const winner = m.won ? leftName : rightName;
  const score = `${Math.max(...m.score)}–${Math.min(...m.score)}`;
  return `${when ? `${when}. ` : ''}${winner} won ${score}. Open match page.`;
}

/** The map's display name: as stored with the result, else the catalog, else the id tidied up. */
export function mapLabel(g: H2HGameRow): string {
  if (g.mapName) return g.mapName;
  if (!g.mapId) return '–';
  const known = MAPS.find((m) => m.id === g.mapId);
  if (known) return known.name;
  return g.mapId
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** "1 game", "2 games". */
export function gamesCount(n: number): string {
  return n === 1 ? '1 game' : `${n} games`;
}
