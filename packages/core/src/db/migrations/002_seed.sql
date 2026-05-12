-- LeagueManager: Seed Data
-- 14 players, 3 tiers, Season 1, tier assignments

-- Tiers (static reference data)
INSERT OR IGNORE INTO tiers (id, display_name, sort_order, civ_rule, rules_summary) VALUES
  ('code_s', 'Code S', 1, 'pro_draft',
   'Full civ draft via aoe2cm before each series. Map draft determines the maps, civ draft determines available civilizations.'),
  ('code_a', 'Code A', 2, 'win_lock',
   'Win-lock: you cannot reuse a civilization you have already won with in the current match. Losing with a civ keeps it available.'),
  ('code_b', 'Code B', 3, 'unrestricted',
   'No civ restrictions. Pick any civilization for any game.');

-- Players (ordered by tier for readability)
-- Code S (4 players)
INSERT INTO players (display_name) VALUES ('Not_A_Beaver');  -- id 1
INSERT INTO players (display_name) VALUES ('Osiris');         -- id 2
INSERT INTO players (display_name) VALUES ('Belligerent Lamb'); -- id 3
INSERT INTO players (display_name) VALUES ('The Tiny');       -- id 4

-- Code A (5 players)
INSERT INTO players (display_name) VALUES ('Cereal');         -- id 5
INSERT INTO players (display_name) VALUES ('Mac');            -- id 6
INSERT INTO players (display_name) VALUES ('TheBert');        -- id 7
INSERT INTO players (display_name) VALUES ('Furby_with_a_Gun'); -- id 8
INSERT INTO players (display_name) VALUES ('Jiggy');          -- id 9

-- Code B (5 players)
INSERT INTO players (display_name) VALUES ('AceMahoney');     -- id 10
INSERT INTO players (display_name) VALUES ('JimmyShmo');      -- id 11
INSERT INTO players (display_name) VALUES ('GiltFerret');     -- id 12
INSERT INTO players (display_name) VALUES ('Poplo');          -- id 13
INSERT INTO players (display_name) VALUES ('L_McG');          -- id 14

-- Season 1
INSERT INTO seasons (season_number, status, best_of, notes) VALUES
  (1, 'active', 3, 'Inaugural season. Code S: 4 players, Code A: 5 players, Code B: 5 players.');

-- Tier assignments for Season 1
-- Code S
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 1, 'code_s');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 2, 'code_s');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 3, 'code_s');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 4, 'code_s');

-- Code A
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 5, 'code_a');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 6, 'code_a');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 7, 'code_a');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 8, 'code_a');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 9, 'code_a');

-- Code B
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 10, 'code_b');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 11, 'code_b');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 12, 'code_b');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 13, 'code_b');
INSERT INTO tier_assignments (season_id, player_id, tier_id) VALUES (1, 14, 'code_b');

-- Round-robin matches for Season 1
-- Code S: 4 players → 6 matches, 3 rounds
-- Generated using circle method (player IDs always ordered low < high)
-- Round 1
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 1, 4, 3, 1);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 2, 3, 3, 1);
-- Round 2
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 1, 3, 3, 2);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 2, 4, 3, 2);
-- Round 3
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 1, 2, 3, 3);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_s', 3, 4, 3, 3);

-- Code A: 5 players → 10 matches, 5 rounds (1 bye per round)
-- Round 1: bye = player 9 (Jiggy)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 5, 8, 3, 1);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 6, 7, 3, 1);
-- Round 2: bye = player 8 (Furby_with_a_Gun)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 5, 7, 3, 2);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 6, 9, 3, 2);
-- Round 3: bye = player 7 (TheBert)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 5, 6, 3, 3);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 8, 9, 3, 3);
-- Round 4: bye = player 6 (Mac)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 5, 9, 3, 4);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 7, 8, 3, 4);
-- Round 5: bye = player 5 (Cereal)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 6, 8, 3, 5);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_a', 7, 9, 3, 5);

-- Code B: 5 players → 10 matches, 5 rounds (1 bye per round)
-- Round 1: bye = player 14 (L_McG)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 10, 13, 3, 1);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 11, 12, 3, 1);
-- Round 2: bye = player 13 (Poplo)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 10, 12, 3, 2);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 11, 14, 3, 2);
-- Round 3: bye = player 12 (GiltFerret)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 10, 11, 3, 3);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 13, 14, 3, 3);
-- Round 4: bye = player 11 (JimmyShmo)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 10, 14, 3, 4);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 12, 13, 3, 4);
-- Round 5: bye = player 10 (AceMahoney)
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 11, 13, 3, 5);
INSERT INTO matches (season_id, tier_id, player1_id, player2_id, best_of, round_number) VALUES (1, 'code_b', 12, 14, 3, 5);
