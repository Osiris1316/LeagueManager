-- LeagueManager: Initial Schema
-- All tables for the AoE4 League Manager

-- Players: registered league participants
CREATE TABLE IF NOT EXISTS players (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name    TEXT NOT NULL,
  discord_id      TEXT,
  aoe4world_id    TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  active          INTEGER NOT NULL DEFAULT 1
);

-- Seasons: each mini-season is a round-robin cycle
CREATE TABLE IF NOT EXISTS seasons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  season_number   INTEGER NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'active', 'complete')),
  best_of         INTEGER NOT NULL DEFAULT 3
                  CHECK(best_of IN (3, 5)),
  started_at      TEXT,
  completed_at    TEXT,
  notes           TEXT
);

-- Tiers: static reference for the three skill tiers
CREATE TABLE IF NOT EXISTS tiers (
  id              TEXT PRIMARY KEY
                  CHECK(id IN ('code_s', 'code_a', 'code_b')),
  display_name    TEXT NOT NULL,
  sort_order      INTEGER NOT NULL,
  civ_rule        TEXT NOT NULL
                  CHECK(civ_rule IN ('pro_draft', 'win_lock', 'unrestricted')),
  rules_summary   TEXT
);

-- Tier assignments: links players to tiers per season (the roster)
CREATE TABLE IF NOT EXISTS tier_assignments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id       INTEGER NOT NULL REFERENCES seasons(id),
  player_id       INTEGER NOT NULL REFERENCES players(id),
  tier_id         TEXT NOT NULL REFERENCES tiers(id),
  final_rank      INTEGER,
  promoted        INTEGER NOT NULL DEFAULT 0,
  relegated       INTEGER NOT NULL DEFAULT 0,
  UNIQUE(season_id, player_id)
);

-- Matches: a Bo3 or Bo5 between two players in a season+tier
-- IMPORTANT: player1_id must always be < player2_id to prevent duplicate pairings.
-- The scheduling algorithm enforces this; the CHECK constraint guarantees it.
CREATE TABLE IF NOT EXISTS matches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id       INTEGER NOT NULL REFERENCES seasons(id),
  tier_id         TEXT NOT NULL REFERENCES tiers(id),
  player1_id      INTEGER NOT NULL REFERENCES players(id),
  player2_id      INTEGER NOT NULL REFERENCES players(id),
  best_of         INTEGER NOT NULL DEFAULT 3
                  CHECK(best_of IN (3, 5)),
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending', 'scheduled', 'in_progress', 'complete')),
  winner_id       INTEGER REFERENCES players(id),
  player1_score   INTEGER NOT NULL DEFAULT 0,
  player2_score   INTEGER NOT NULL DEFAULT 0,
  scheduled_at    TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  map_draft_id    TEXT,
  civ_draft_id    TEXT,
  round_number    INTEGER,
  CHECK(player1_id < player2_id),
  UNIQUE(season_id, player1_id, player2_id)
);

-- Games: individual maps within a match
CREATE TABLE IF NOT EXISTS games (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        INTEGER NOT NULL REFERENCES matches(id),
  game_number     INTEGER NOT NULL
                  CHECK(game_number >= 1 AND game_number <= 5),
  map_name        TEXT,
  map_id          TEXT,
  player1_civ     TEXT,
  player1_civ_id  TEXT,
  player2_civ     TEXT,
  player2_civ_id  TEXT,
  winner_id       INTEGER REFERENCES players(id),
  played_at       TEXT,
  aoe4world_game_id TEXT,
  notes           TEXT,
  UNIQUE(match_id, game_number)
);

-- Match civ history: tracks civ usage for Code A win-lock enforcement
CREATE TABLE IF NOT EXISTS match_civ_history (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id        INTEGER NOT NULL REFERENCES matches(id),
  player_id       INTEGER NOT NULL REFERENCES players(id),
  civ_id          TEXT NOT NULL,
  game_number     INTEGER NOT NULL,
  won             INTEGER NOT NULL DEFAULT 0,
  UNIQUE(match_id, player_id, game_number)
);

-- Season transitions: audit log for promotions and relegations
CREATE TABLE IF NOT EXISTS season_transitions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  from_season_id  INTEGER NOT NULL REFERENCES seasons(id),
  to_season_id    INTEGER NOT NULL REFERENCES seasons(id),
  player_id       INTEGER NOT NULL REFERENCES players(id),
  from_tier_id    TEXT NOT NULL REFERENCES tiers(id),
  to_tier_id      TEXT NOT NULL REFERENCES tiers(id),
  transition_type TEXT NOT NULL
                  CHECK(transition_type IN ('promotion', 'relegation', 'static')),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS _migrations (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  filename        TEXT NOT NULL UNIQUE,
  applied_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
