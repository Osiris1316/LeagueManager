import { Hono } from 'hono';
import type { Match } from '@league-manager/core';

type AdminEnv = {
  Bindings: {
    DB: D1Database;
    ADMIN_TOKEN: string;
  };
};

export function adminRoutes() {
  const routes = new Hono<AdminEnv>();

  // ── Auth middleware for all /admin/* routes ──
  routes.use('/*', async (c, next) => {
    const token = c.req.header('X-Admin-Token');
    const expected = c.env.ADMIN_TOKEN;

    if (!expected) {
      return c.json({ error: 'Admin not configured' }, 503);
    }

    if (!token || token !== expected) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  });

  // ── Verify token ──
  // POST /api/admin/verify
  routes.post('/verify', async (c) => {
    return c.json({ status: 'ok' });
  });

  // ── Report match results ──
  // POST /api/admin/matches/:id/report
  routes.post('/matches/:id/report', async (c) => {
    const db = c.env.DB;
    const matchId = parseInt(c.req.param('id'), 10);

    if (isNaN(matchId)) {
      return c.json({ error: 'Invalid match ID' }, 400);
    }

    const match = await db
      .prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first<Match>();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    let body: {
      games: {
        game_number: number;
        map_name?: string;
        map_id?: string;
        player1_civ?: string;
        player1_civ_id?: string;
        player2_civ?: string;
        player2_civ_id?: string;
        winner_id: number;
      }[];
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.games || !Array.isArray(body.games) || body.games.length === 0) {
      return c.json({ error: 'games array is required' }, 400);
    }

    const winsNeeded = Math.ceil(match.best_of / 2);

    for (const game of body.games) {
      if (typeof game.game_number !== 'number' || game.game_number < 1 || game.game_number > match.best_of) {
        return c.json({ error: `Invalid game_number: ${game.game_number}` }, 400);
      }

      if (game.winner_id !== match.player1_id && game.winner_id !== match.player2_id) {
        return c.json({
          error: `winner_id ${game.winner_id} is not a participant in this match`,
        }, 400);
      }
    }

    const gameNumbers = body.games.map(g => g.game_number);
    if (new Set(gameNumbers).size !== gameNumbers.length) {
      return c.json({ error: 'Duplicate game numbers' }, 400);
    }

    let player1Score = 0;
    let player2Score = 0;

    for (const game of body.games) {
      if (game.winner_id === match.player1_id) player1Score++;
      else player2Score++;
    }

    let matchWinnerId: number | null = null;
    if (player1Score >= winsNeeded) matchWinnerId = match.player1_id;
    else if (player2Score >= winsNeeded) matchWinnerId = match.player2_id;

    const now = new Date().toISOString();

    await db.prepare('DELETE FROM games WHERE match_id = ?').bind(matchId).run();
    await db.prepare('DELETE FROM match_civ_history WHERE match_id = ?').bind(matchId).run();

    for (const game of body.games) {
      await db
        .prepare(`
          INSERT INTO games (match_id, game_number, map_name, map_id,
            player1_civ, player1_civ_id, player2_civ, player2_civ_id,
            winner_id, played_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          matchId, game.game_number,
          game.map_name ?? null, game.map_id ?? null,
          game.player1_civ ?? null, game.player1_civ_id ?? null,
          game.player2_civ ?? null, game.player2_civ_id ?? null,
          game.winner_id, now
        )
        .run();

      if (game.player1_civ_id) {
        await db
          .prepare('INSERT INTO match_civ_history (match_id, player_id, civ_id, game_number, won) VALUES (?, ?, ?, ?, ?)')
          .bind(matchId, match.player1_id, game.player1_civ_id, game.game_number,
            game.winner_id === match.player1_id ? 1 : 0)
          .run();
      }

      if (game.player2_civ_id) {
        await db
          .prepare('INSERT INTO match_civ_history (match_id, player_id, civ_id, game_number, won) VALUES (?, ?, ?, ?, ?)')
          .bind(matchId, match.player2_id, game.player2_civ_id, game.game_number,
            game.winner_id === match.player2_id ? 1 : 0)
          .run();
      }
    }

    await db
      .prepare(`
        UPDATE matches
        SET player1_score = ?, player2_score = ?, winner_id = ?,
            status = ?, started_at = COALESCE(started_at, ?), completed_at = ?
        WHERE id = ?
      `)
      .bind(player1Score, player2Score, matchWinnerId,
        matchWinnerId ? 'complete' : 'in_progress',
        now, matchWinnerId ? now : null, matchId)
      .run();

    const updated = await db
      .prepare(`
        SELECT m.*, p1.display_name as player1_name, p2.display_name as player2_name,
          w.display_name as winner_name
        FROM matches m
        JOIN players p1 ON m.player1_id = p1.id
        JOIN players p2 ON m.player2_id = p2.id
        LEFT JOIN players w ON m.winner_id = w.id
        WHERE m.id = ?
      `)
      .bind(matchId)
      .first();

    const { results: savedGames } = await db
      .prepare('SELECT * FROM games WHERE match_id = ? ORDER BY game_number')
      .bind(matchId)
      .all();

    return c.json({ match: updated, games: savedGames, message: matchWinnerId ? 'Match complete' : 'Match in progress' });
  });

  // ── Clear match results ──
  // POST /api/admin/matches/:id/clear
  routes.post('/matches/:id/clear', async (c) => {
    const db = c.env.DB;
    const matchId = parseInt(c.req.param('id'), 10);

    if (isNaN(matchId)) {
      return c.json({ error: 'Invalid match ID' }, 400);
    }

    const match = await db
      .prepare('SELECT * FROM matches WHERE id = ?')
      .bind(matchId)
      .first<Match>();

    if (!match) {
      return c.json({ error: 'Match not found' }, 404);
    }

    await db.prepare('DELETE FROM games WHERE match_id = ?').bind(matchId).run();
    await db.prepare('DELETE FROM match_civ_history WHERE match_id = ?').bind(matchId).run();
    await db
      .prepare(`
        UPDATE matches
        SET player1_score = 0, player2_score = 0, winner_id = NULL,
            status = 'pending', started_at = NULL, completed_at = NULL
        WHERE id = ?
      `)
      .bind(matchId)
      .run();

    return c.json({ message: 'Results cleared' });
  });

  // ── Schedule a match ──
  // POST /api/admin/matches/:id/schedule
  routes.post('/matches/:id/schedule', async (c) => {
    const db = c.env.DB;
    const matchId = parseInt(c.req.param('id'), 10);

    if (isNaN(matchId)) {
      return c.json({ error: 'Invalid match ID' }, 400);
    }

    let body: { scheduled_at: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    if (!body.scheduled_at) {
      return c.json({ error: 'scheduled_at is required' }, 400);
    }

    await db
      .prepare('UPDATE matches SET scheduled_at = ? WHERE id = ?')
      .bind(body.scheduled_at, matchId)
      .run();

    return c.json({ message: 'Match scheduled' });
  });

  return routes;
}