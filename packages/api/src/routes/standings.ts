import { Hono } from 'hono';
import { computeStandings } from '@league-manager/core';
import type { Match, Player, TierAssignment, Tier, Season } from '@league-manager/core';

export function standingsRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Full standings for a season: all tiers with standings + schedule
  routes.get('/standings/:seasonId', async (c) => {
    const db = c.env.DB;
    const seasonId = parseInt(c.req.param('seasonId'), 10);

    if (isNaN(seasonId)) return c.json({ error: 'Invalid season ID' }, 400);

    const season = await db
      .prepare('SELECT * FROM seasons WHERE id = ?')
      .bind(seasonId)
      .first<Season>();

    if (!season) return c.json({ error: 'Season not found' }, 404);

    // Get all tiers
    const { results: tiers } = await db
      .prepare('SELECT * FROM tiers ORDER BY sort_order')
      .all<Tier>();

    // Get all tier assignments for this season
    const { results: assignments } = await db
      .prepare('SELECT * FROM tier_assignments WHERE season_id = ?')
      .bind(seasonId)
      .all<TierAssignment>();

    // Get all players (for name lookup)
    const { results: players } = await db
      .prepare('SELECT * FROM players')
      .all<Player>();

    const playerNames: Record<number, string> = {};
    for (const p of players) {
      playerNames[p.id] = p.display_name;
    }

    // Get all matches for this season
    const { results: allMatches } = await db
      .prepare(`
        SELECT m.*,
          p1.display_name as player1_name,
          p2.display_name as player2_name,
          w.display_name as winner_name
        FROM matches m
        JOIN players p1 ON m.player1_id = p1.id
        JOIN players p2 ON m.player2_id = p2.id
        LEFT JOIN players w ON m.winner_id = w.id
        WHERE m.season_id = ?
        ORDER BY m.round_number ASC, m.id ASC
      `)
      .bind(seasonId)
      .all<Match & { player1_name: string; player2_name: string; winner_name: string | null }>();
    
    // Get rules for this season's tiers
    const { results: tierRules } = await db
      .prepare('SELECT tier_id, rules_summary FROM season_tier_rules WHERE season_id = ?')
      .bind(seasonId)
      .all<{ tier_id: string; rules_summary: string | null }>();

    const rulesByTier: Record<string, string | null> = {};
    for (const r of tierRules) {
      rulesByTier[r.tier_id] = r.rules_summary;
    }

    // Build per-tier data
    const tierData = tiers.map(tier => {
      const tierPlayerIds = assignments
        .filter(a => a.tier_id === tier.id)
        .map(a => a.player_id);

      const tierMatches = allMatches.filter(
        m => m.tier_id === tier.id
      );

      const standings = computeStandings({
        playerIds: tierPlayerIds,
        playerNames,
        matches: tierMatches,
      });

      // Group matches by round
      const rounds: Record<number, typeof tierMatches> = {};
      for (const m of tierMatches) {
        const rn = m.round_number ?? 0;
        if (!rounds[rn]) rounds[rn] = [];
        rounds[rn].push(m);
      }

      return {
      tier,
      standings,
      matches: tierMatches,
      rounds,
      rules_summary: rulesByTier[tier.id] ?? null,
    };
    });

    return c.json({ season, tiers: tierData });
  });

  // Full rules text for a season + tier (loaded on demand when user opens modal)
  routes.get('/seasons/:seasonId/tiers/:tierId/rules', async (c) => {
    const db = c.env.DB;
    const seasonId = parseInt(c.req.param('seasonId'), 10);
    const tierId = c.req.param('tierId');

    if (isNaN(seasonId)) return c.json({ error: 'Invalid season ID' }, 400);

    const rules = await db
      .prepare('SELECT rules_summary, rules_full FROM season_tier_rules WHERE season_id = ? AND tier_id = ?')
      .bind(seasonId, tierId)
      .first<{ rules_summary: string | null; rules_full: string | null }>();

    if (!rules) return c.json({ error: 'Rules not found for this season and tier' }, 404);

    return c.json(rules);
  });

  return routes;
}
