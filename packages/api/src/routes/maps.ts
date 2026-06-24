import { Hono } from 'hono';

export function mapsRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Active map pool for a season:
  // the season_maps rows for this season, joined to the catalog for display names.
  routes.get('/seasons/:seasonId/maps', async (c) => {
    const db = c.env.DB;
    const seasonId = parseInt(c.req.param('seasonId'), 10);

    if (isNaN(seasonId)) return c.json({ error: 'Invalid season ID' }, 400);

    const { results } = await db
      .prepare(`
        SELECT m.id, m.name
        FROM season_maps sm
        JOIN maps m ON m.id = sm.map_id
        WHERE sm.season_id = ?
        ORDER BY m.name
      `)
      .bind(seasonId)
      .all();

    return c.json(results);
  });

  return routes;
}