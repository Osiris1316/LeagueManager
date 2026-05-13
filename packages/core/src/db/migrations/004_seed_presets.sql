-- 004_seed_presets.sql
-- Populates Season 1 draft preset links for all tiers.

-- Map draft preset (all tiers, Season 1)
INSERT INTO season_tier_presets (season_id, tier_id, draft_type, preset_id, preset_url, label)
VALUES
  (1, 'code_s', 'map', 'Paifr', 'https://aoe2cm.net/preset/Paifr', 'Bo3 Map Draft'),
  (1, 'code_a', 'map', 'Paifr', 'https://aoe2cm.net/preset/Paifr', 'Bo3 Map Draft'),
  (1, 'code_b', 'map', 'Paifr', 'https://aoe2cm.net/preset/Paifr', 'Bo3 Map Draft');

-- Civ-for-game draft preset (all tiers, Season 1)
INSERT INTO season_tier_presets (season_id, tier_id, draft_type, preset_id, preset_url, label)
VALUES
  (1, 'code_s', 'civ_game', 'gFhTD', 'https://aoe2cm.net/preset/gFhTD', 'Civ Draft for Map / Game'),
  (1, 'code_a', 'civ_game', 'gFhTD', 'https://aoe2cm.net/preset/gFhTD', 'Civ Draft for Map / Game'),
  (1, 'code_b', 'civ_game', 'gFhTD', 'https://aoe2cm.net/preset/gFhTD', 'Civ Draft for Map / Game');

-- Main civ draft preset (Code S only, Season 1)
INSERT INTO season_tier_presets (season_id, tier_id, draft_type, preset_id, preset_url, label)
VALUES
  (1, 'code_s', 'civ_main', 'vEISc', 'https://aoe2cm.net/preset/vEISc', 'Bo3 Match Civ Draft');