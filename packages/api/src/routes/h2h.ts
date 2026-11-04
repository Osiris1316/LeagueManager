import { Hono } from 'hono';
import {
  explodeToSlotViews,
  computeH2H,
  computeCivMatchups,
  rowToEnrichedGame,
  rowToEnrichedMatch,
} from '@league-manager/core';

export function h2hRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Head-to-head between two players, cross-season and cross-tier.
  // series (match-grain) + civMatchups (slot-grain), both from p1's perspective.
  routes.get('/h2h', async (c) => {
    const db = c.env.DB;
    const p1 = parseInt(c.req.query('p1') ?? '', 10);
    const p2 = parseInt(c.req.query('p2') ?? '', 10);

    if (isNaN(p1) || isNaN(p2)) return c.json({ error: 'Invalid player IDs' }, 400);
    if (p1 === p2) return c.json({ error: 'Players must differ' }, 400);

    // Canonical storage order: lower id is always player1 (the CHECK constraint).
    const lo = Math.min(p1, p2);
    const hi = Math.max(p1, p2);

    const matchRows = await db
      .prepare(`
        SELECT m.season_id, m.tier_id, m.id AS match_id, m.round_number AS round,
               m.player1_id, m.player2_id, m.player1_score, m.player2_score,
               m.winner_id, m.completed_at
        FROM matches m
        WHERE m.player1_id = ? AND m.player2_id = ?
      `)
      .bind(lo, hi)
      .all();

    const gameRows = await db
      .prepare(`
        SELECT m.season_id, m.tier_id, g.match_id, m.round_number AS round,
               g.game_number, m.player1_id, m.player2_id,
               g.player1_civ_id, g.player2_civ_id, g.map_id, g.winner_id
        FROM games g
        JOIN matches m ON m.id = g.match_id
        WHERE g.winner_id IS NOT NULL
          AND m.player1_id = ? AND m.player2_id = ?
      `)
      .bind(lo, hi)
      .all();

    const matches = (matchRows.results as Record<string, unknown>[]).map(rowToEnrichedMatch);
    const slots = explodeToSlotViews(
      (gameRows.results as Record<string, unknown>[]).map(rowToEnrichedGame),
    );

    // Perspective = p1 as the caller passed it (may be lo or hi — fold normalizes).
    return c.json({
      perspectivePlayerId: p1,
      opponentPlayerId: p2,
      series: computeH2H(matches, p1, p2),
      civMatchups: computeCivMatchups(slots, p1, p2),
    });
  });

  return routes;
}