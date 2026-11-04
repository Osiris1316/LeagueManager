// Display catalog for game titles.
// The `titles` table in D1 is the FK target and enforces referential
// integrity; this catalog carries display data. Ids must match.

export interface Title {
  id: string;
  name: string;
  shortName: string;
  assetPrefix: string;
  sortOrder: number;
}

export const TITLES: readonly Title[] = [
  { id: 'aoe4', name: 'Age of Empires IV', shortName: 'AoE4', assetPrefix: 'aoe4', sortOrder: 1 },
  { id: 'bw', name: 'Brood War', shortName: 'BW', assetPrefix: 'bw', sortOrder: 2 },
  { id: 'sc2', name: 'StarCraft II', shortName: 'SC2', assetPrefix: 'sc2', sortOrder: 3 },
];

const byId = new Map(TITLES.map((t) => [t.id, t]));

export function titleById(id: string): Title | null {
  return byId.get(id) ?? null;
}