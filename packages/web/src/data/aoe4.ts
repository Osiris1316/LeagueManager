// Civ catalog is the single source of truth in core (shared with the wizard).
export type { Civ } from '@league-manager/core';
export { CIVS, civById } from '@league-manager/core';

// Legacy name-lookup fallback only. The authoritative map catalog + per-season
// pool live in D1 (maps + season_maps) and arrive via `available_maps`.
export interface GameMap {
  id: string;
  name: string;
}

export const MAPS: GameMap[] = [
  { id: 'egc-dry-arabia', name: 'EGC-Dry Arabia' },
  { id: 'egc-frisian-marshes', name: 'EGC-Frisian Marshes' },
  { id: 'four-lakes', name: 'Four Lakes' },
  { id: 'hill-and-dale', name: 'Hill and Dale' },
  { id: 'rocky-river', name: 'Rocky River' },
  { id: 'sunkenlands', name: 'Sunkenlands' },
  { id: 'wasteland', name: 'Wasteland' },
];