-- 007_season_titles.sql
-- Adds multi-title support to seasons.
--
-- title_id      which game a season belongs to ('aoe4', 'bw', 'sc2')
-- season_index  the per-title season number used for display (restarts at 1
--               for each title, so titles never share a "Season N" label)
-- format        the competition format ('round_robin')
-- name          optional human label for a season
--
-- NOTE: the production D1 database already has these four columns (added
-- out of band, never migrated). On that database, mark this file as applied
-- instead of running it:
--
--   npx wrangler d1 execute league-manager-db --remote \
--     --command "INSERT INTO d1_migrations (name) VALUES ('007_season_titles.sql')"
--
-- Fresh and local databases start from 001_initial.sql, which lacks the
-- columns, so they need this migration applied normally.

ALTER TABLE seasons ADD COLUMN title_id TEXT NOT NULL DEFAULT 'aoe4';
ALTER TABLE seasons ADD COLUMN season_index INTEGER NOT NULL DEFAULT 1;
ALTER TABLE seasons ADD COLUMN format TEXT NOT NULL DEFAULT 'round_robin';
ALTER TABLE seasons ADD COLUMN name TEXT;

-- The display index restarts per title; with a single title it tracks the
-- global season number.
UPDATE seasons SET season_index = season_number WHERE title_id = 'aoe4';
