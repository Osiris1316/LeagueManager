import { Hono } from 'hono';
import type { Player, TierAssignment, Match } from '@league-manager/core';

export function playersRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // List all active players
  routes.get('/players', async (c) => {
    const db = c.env.DB;
    const { results } = await db
      .prepare('SELECT * FROM players WHERE active = 1 ORDER BY display_name')
      .all<Player>();
    return c.json(results);
  });

  // Single player detail with current tier and match history
  routes.get('/players/:id', async (c) => {
    const db = c.env.DB;
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) return c.json({ error: 'Invalid player ID' }, 400);

    const player = await db
      .prepare('SELECT * FROM players WHERE id = ?')
      .bind(id)
      .first<Player>();

    if (!player) return c.json({ error: 'Player not found' }, 404);

    // Current tier assignment (most recent active season)
    const tierAssignment = await db
      .prepare(`
        SELECT ta.*, t.display_name as tier_name, t.civ_rule, s.season_number
        FROM tier_assignments ta
        JOIN tiers t ON ta.tier_id = t.id
        JOIN seasons s ON ta.season_id = s.id
        WHERE ta.player_id = ? AND s.status = 'active'
        ORDER BY s.season_number DESC
        LIMIT 1
      `)
      .bind(id)
      .first();

    // Match history across all seasons
    const { results: matches } = await db
      .prepare(`
        SELECT m.*,
          p1.display_name as player1_name,
          p2.display_name as player2_name,
          w.display_name as winner_name,
          s.season_number
        FROM matches m
        JOIN players p1 ON m.player1_id = p1.id
        JOIN players p2 ON m.player2_id = p2.id
        LEFT JOIN players w ON m.winner_id = w.id
        JOIN seasons s ON m.season_id = s.id
        WHERE m.player1_id = ? OR m.player2_id = ?
        ORDER BY s.season_number DESC, m.round_number ASC
      `)
      .bind(id, id)
      .all();

    return c.json({ player, tierAssignment, matches });
  });

  return routes;
}
