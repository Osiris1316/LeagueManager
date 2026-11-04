-- 006_maps.sql
-- Adds a maps catalog and a per-season map pool (join table).
--
-- maps        = every map that exists (the menu of all choices)
-- season_maps = which catalog maps are active for a given season (the pool)
--
-- Schema only. Catalog rows and per-season pools are seeded separately.

CREATE TABLE maps (
  id    TEXT PRIMARY KEY,   -- aoe2cm-compatible id, e.g. 'dry-arabia'
  name  TEXT NOT NULL       -- display name, e.g. 'Dry Arabia'
);

CREATE TABLE season_maps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id  INTEGER NOT NULL REFERENCES seasons(id),
  map_id     TEXT NOT NULL REFERENCES maps(id),
  UNIQUE(season_id, map_id)
);