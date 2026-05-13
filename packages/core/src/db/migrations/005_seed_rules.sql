-- 005_seed_rules.sql
-- Populates Season 1 rules from existing tier summaries + placeholder full rules.

INSERT INTO season_tier_rules (season_id, tier_id, rules_summary, rules_full)
VALUES
  (1, 'code_s',
   'Full civ draft via aoe2cm before each series. Map draft determines the maps, civ draft determines available civilizations.',
   'Full rules for Code S coming soon.'),
  (1, 'code_a',
   'Win-lock: you cannot reuse a civilization you have already won with in the current match. Losing with a civ keeps it available.',
   'Full rules for Code A coming soon.'),
  (1, 'code_b',
   'No civ restrictions. Pick any civilization for any game.',
   'Full rules for Code B coming soon.');