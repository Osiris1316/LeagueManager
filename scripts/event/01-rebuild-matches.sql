-- Rebuild of the matches table for events (November 2026).
--
-- Why: the original table only allowed best of 3 or 5, and allowed each pair
-- of players to meet once per season. Events need Bo1, and a double
-- elimination bracket needs rematches (the grand final reset is one).
--
-- What changes:
--   best_of may now be 1, 3, 5 or 7.
--   New column bracket_slot (e.g. 'UB-SF1'): which bracket slot a match fills.
--   "One meeting per pair per season" now applies only to matches with no
--   bracket slot (league and group stage), as a partial unique index.
--   Each bracket slot can hold one match per season, as a partial unique index.
--   player1_id < player2_id is kept, and so is match_type (a column that
--   exists in production but not in the repo's 001 migration).
-- Every existing row and id is copied unchanged.
--
-- Run as ONE file, not statement by statement: SQLite can't drop a CHECK
-- constraint, so the table is copied, dropped and renamed in one transaction.
-- games and match_civ_history point at matches(id); deferring foreign keys
-- lets the old table go before the copy takes its name. No foreign key in
-- this schema uses ON DELETE CASCADE, so nothing is deleted along the way.
--
--   npx wrangler d1 execute league-manager-db --remote --file=scripts/event/01-rebuild-matches.sql

PRAGMA defer_foreign_keys = on;

CREATE TABLE matches_new (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id       INTEGER NOT NULL REFERENCES seasons(id),
  tier_id         TEXT NOT NULL REFERENCES tiers(id),
  player1_id      INTEGER NOT NULL REFERENCES players(id),
  player2_id      INTEGER NOT NULL REFERENCES players(id),
  best_of         INTEGER NOT NULL DEFAULT 3
                  CHECK(best_of IN (1, 3, 5, 7)),
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
  match_type      TEXT NOT NULL DEFAULT 'round_robin',
  bracket_slot    TEXT,
  CHECK(player1_id < player2_id)
);

INSERT INTO matches_new (
  id, season_id, tier_id, player1_id, player2_id, best_of, status, winner_id,
  player1_score, player2_score, scheduled_at, started_at, completed_at,
  map_draft_id, civ_draft_id, round_number, match_type, bracket_slot
)
SELECT
  id, season_id, tier_id, player1_id, player2_id, best_of, status, winner_id,
  player1_score, player2_score, scheduled_at, started_at, completed_at,
  map_draft_id, civ_draft_id, round_number, match_type, NULL
FROM matches;

DROP TABLE matches;

ALTER TABLE matches_new RENAME TO matches;

CREATE UNIQUE INDEX matches_one_meeting_per_season
  ON matches (season_id, player1_id, player2_id)
  WHERE bracket_slot IS NULL;

CREATE UNIQUE INDEX matches_one_match_per_bracket_slot
  ON matches (season_id, bracket_slot)
  WHERE bracket_slot IS NOT NULL;

PRAGMA defer_foreign_keys = off;
