import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { seasonsRoutes } from './routes/seasons.js';
import { playersRoutes } from './routes/players.js';
import { matchesRoutes } from './routes/matches.js';
import { mapsRoutes } from './routes/maps.js';
import { standingsRoutes } from './routes/standings.js';
import { adminRoutes } from './routes/admin.js';
import { playerStatsRoutes } from './routes/player-stats.js';
import { h2hRoutes } from './routes/h2h.js';

export type Bindings = {
  DB: D1Database;
  FRONTEND_ORIGIN: string;
  ADMIN_TOKEN: string;
};

export type AppEnv = { Bindings: Bindings };

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('/api/*', cors({
    origin: (origin, c) => {
      const allowed = c.env.FRONTEND_ORIGIN;
      if (allowed) return allowed;
      return origin ?? '*';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Admin-Token'],
    maxAge: 86400,
  }));

  app.get('/api/health', (c) => c.json({ status: 'ok' }));

  app.route('/api', seasonsRoutes<AppEnv>());
  app.route('/api', playersRoutes<AppEnv>());
  app.route('/api', matchesRoutes<AppEnv>());
  app.route('/api', mapsRoutes<AppEnv>());
  app.route('/api', standingsRoutes<AppEnv>());
  app.route('/api/admin', adminRoutes());
  app.route('/api', playerStatsRoutes<AppEnv>());
  app.route('/api', h2hRoutes<AppEnv>());

  return app;
}