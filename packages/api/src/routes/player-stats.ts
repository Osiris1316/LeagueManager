import { Hono } from 'hono';
import {
  explodeToSlotViews,
  computeCivStats,
  computeMapStats,
  rowToEnrichedGame,
} from '@league-manager/core';

export function playerStatsRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // A player's civ + map win-rate tables.
  // All their completed games, exploded to slots, then filtered per fold.
  routes.get('/players/:playerId/stats', async (c) => {
    const db = c.env.DB;
    const playerId = parseInt(c.req.param('playerId'), 10);

    if (isNaN(playerId)) return c.json({ error: 'Invalid player ID' }, 400);

    const { results } = await db
      .prepare(`
        SELECT m.season_id, m.tier_id, g.match_id, m.round_number AS round,
               g.game_number, m.player1_id, m.player2_id,
               g.player1_civ_id, g.player2_civ_id, g.map_id, g.winner_id
        FROM games g
        JOIN matches m ON m.id = g.match_id
        WHERE g.winner_id IS NOT NULL
          AND (m.player1_id = ? OR m.player2_id = ?)
      `)
      .bind(playerId, playerId)
      .all();

    const slots = explodeToSlotViews(
      (results as Record<string, unknown>[]).map(rowToEnrichedGame),
    );

    return c.json({
      playerId,
      civs: computeCivStats(slots, playerId),
      maps: computeMapStats(slots, playerId),
    });
  });

  return routes;
}