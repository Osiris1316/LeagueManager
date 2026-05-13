-- 003_season_tier_config.sql
-- Adds per-season, per-tier rules and draft preset configuration.

CREATE TABLE season_tier_rules (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id     INTEGER NOT NULL REFERENCES seasons(id),
  tier_id       TEXT NOT NULL REFERENCES tiers(id),
  rules_summary TEXT,
  rules_full    TEXT,
  UNIQUE(season_id, tier_id)
);

CREATE TABLE season_tier_presets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id     INTEGER NOT NULL REFERENCES seasons(id),
  tier_id       TEXT NOT NULL REFERENCES tiers(id),
  draft_type    TEXT NOT NULL CHECK(draft_type IN ('map', 'civ_main', 'civ_game')),
  preset_id     TEXT,
  preset_url    TEXT,
  label         TEXT,
  UNIQUE(season_id, tier_id, draft_type)
);