import { Hono } from 'hono';
import type { Season, Tier } from '@league-manager/core';

export function seasonsRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // List all seasons (most recent first)
  routes.get('/seasons', async (c) => {
    const db = c.env.DB;
    const { results } = await db
      .prepare('SELECT * FROM seasons ORDER BY season_number DESC')
      .all<Season>();
    return c.json(results);
  });

  // Get single season with its tiers
  routes.get('/seasons/:id', async (c) => {
    const db = c.env.DB;
    const id = parseInt(c.req.param('id'), 10);

    if (isNaN(id)) return c.json({ error: 'Invalid season ID' }, 400);

    const season = await db
      .prepare('SELECT * FROM seasons WHERE id = ?')
      .bind(id)
      .first<Season>();

    if (!season) return c.json({ error: 'Season not found' }, 404);

    const { results: tiers } = await db
      .prepare('SELECT * FROM tiers ORDER BY sort_order')
      .all<Tier>();

    return c.json({ season, tiers });
  });

  // Get tiers (static reference data)
  routes.get('/tiers', async (c) => {
    const db = c.env.DB;
    const { results } = await db
      .prepare('SELECT * FROM tiers ORDER BY sort_order')
      .all<Tier>();
    return c.json(results);
  });

  return routes;
}
