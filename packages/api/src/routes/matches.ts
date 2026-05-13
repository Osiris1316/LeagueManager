import { Hono } from 'hono';
import type { Game } from '@league-manager/core';

export function matchesRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Matches for a season, optionally filtered by tier
  routes.get('/seasons/:seasonId/matches', async (c) => {
    const db = c.env.DB;
    const seasonId = parseInt(c.req.param('seasonId'), 10);
    const tierId = c.req.query('tier');

    if (isNaN(seasonId)) return c.json({ error: 'Invalid season ID' }, 400);

    let sql = `
      SELECT m.*,
        p1.display_name as player1_name,
        p2.display_name as player2_name,
        w.display_name as winner_name
      FROM matches m
      JOIN players p1 ON m.player1_id = p1.id
      JOIN players p2 ON m.player2_id = p2.id
      LEFT JOIN players w ON m.winner_id = w.id
      WHERE m.season_id = ?
    `;
    const params: (string | number)[] = [seasonId];

    if (tierId) {
      sql += ' AND m.tier_id = ?';
      params.push(tierId);
    }

    sql += ' ORDER BY m.round_number ASC, m.id ASC';

    const stmt = db.prepare(sql);
    const { results } = await stmt.bind(...params).all();
    return c.json(results);
  });

  // Single match detail with games
  routes.get('/matches/:id', async (c) => {
    const db = c.env.DB;
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) return c.json({ error: 'Invalid match ID' }, 400);

    const match = await db
      .prepare(`
        SELECT m.*,
          p1.display_name as player1_name,
          p2.display_name as player2_name,
          w.display_name as winner_name,
          t.display_name as tier_name,
          t.civ_rule
        FROM matches m
        JOIN players p1 ON m.player1_id = p1.id
        JOIN players p2 ON m.player2_id = p2.id
        LEFT JOIN players w ON m.winner_id = w.id
        JOIN tiers t ON m.tier_id = t.id
        WHERE m.id = ?
      `)
      .bind(id)
      .first();

    if (!match) return c.json({ error: 'Match not found' }, 404);
    
    // Get rules summary for this match's season + tier
    const rules = await db
      .prepare('SELECT rules_summary FROM season_tier_rules WHERE season_id = ? AND tier_id = ?')
      .bind(match.season_id, match.tier_id)
      .first<{ rules_summary: string | null }>();

    // Get draft presets for this match's season + tier
    const { results: presets } = await db
      .prepare('SELECT draft_type, preset_id, preset_url, label FROM season_tier_presets WHERE season_id = ? AND tier_id = ?')
      .bind(match.season_id, match.tier_id)
      .all<{ draft_type: string; preset_id: string | null; preset_url: string | null; label: string | null }>();

    const { results: games } = await db
      .prepare('SELECT * FROM games WHERE match_id = ? ORDER BY game_number')
      .bind(id)
      .all<Game>();

    return c.json({
      match,
      games,
      rules_summary: rules?.rules_summary ?? null,
      presets,
    });
  });

  return routes;
}
