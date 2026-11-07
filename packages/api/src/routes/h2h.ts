import { Hono } from 'hono';
import {
  explodeToSlotViews,
  computeH2H,
  computeMeetings,
  computePairGames,
  computeCivMatchups,
  computeCivStats,
  computeTitleRecords,
  rowToEnrichedGame,
  rowToEnrichedMatch,
} from '@league-manager/core';

export function h2hRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Head-to-head between two players, from p1's perspective.
  //
  //   GET /api/h2h?p1=X&p2=Y            every title together (the original behaviour)
  //   GET /api/h2h?p1=X&p2=Y&title=aoe4 one game title only (the match page)
  //
  // Title scope is applied as a pre-filter on the fetched rows, never inside
  // a fold, so every number below is the same fold over the same filtered
  // arrays. The pair's other titles are summarised in `otherTitles`.
  routes.get('/h2h', async (c) => {
    const db = c.env.DB;
    const p1 = parseInt(c.req.query('p1') ?? '', 10);
    const p2 = parseInt(c.req.query('p2') ?? '', 10);
    const title = c.req.query('title') || null;

    if (isNaN(p1) || isNaN(p2)) return c.json({ error: 'Invalid player IDs' }, 400);
    if (p1 === p2) return c.json({ error: 'Players must differ' }, 400);

    // Canonical storage order: lower id is always player1 (the CHECK constraint).
    const lo = Math.min(p1, p2);
    const hi = Math.max(p1, p2);

    // Every match between the pair, in every title (one pair: a handful of rows).
    const matchRows = await db
      .prepare(`
        SELECT m.season_id, s.title_id, s.season_index, m.tier_id, m.id AS match_id,
               m.round_number AS round, m.best_of,
               m.player1_id, m.player2_id, m.player1_score, m.player2_score,
               m.winner_id, m.completed_at
        FROM matches m
        JOIN seasons s ON s.id = m.season_id
        WHERE m.player1_id = ? AND m.player2_id = ?
      `)
      .bind(lo, hi)
      .all();

    // Every completed game either player has played, against anyone. The
    // pair's own games are a subset; the rest tell the civ matrix which civs
    // each player uses in the league ("Everything each has played").
    const gameRows = await db
      .prepare(`
        SELECT m.season_id, s.title_id, m.tier_id, g.match_id, m.round_number AS round,
               g.game_number, m.player1_id, m.player2_id,
               g.player1_civ_id, g.player2_civ_id, g.map_id, g.winner_id,
               COALESCE(g.map_name, mp.name) AS map_name
        FROM games g
        JOIN matches m ON m.id = g.match_id
        JOIN seasons s ON s.id = m.season_id
        LEFT JOIN maps mp ON mp.id = g.map_id
        WHERE g.winner_id IS NOT NULL
          AND (m.player1_id IN (?, ?) OR m.player2_id IN (?, ?))
      `)
      .bind(lo, hi, lo, hi)
      .all();

    const rawGames = gameRows.results as Record<string, unknown>[];
    const allMatches = (matchRows.results as Record<string, unknown>[]).map(rowToEnrichedMatch);
    const allGames = rawGames.map(rowToEnrichedGame);

    const matches = title ? allMatches.filter((m) => m.titleId === title) : allMatches;
    const slots = explodeToSlotViews(
      title ? allGames.filter((g) => g.titleId === title) : allGames,
    );

    // Display names for maps, as stored when the result was reported.
    const mapNames = new Map<string, string>();
    for (const r of rawGames) {
      if (typeof r.map_name === 'string') mapNames.set(`${r.match_id}:${r.game_number}`, r.map_name);
    }

    // Perspective = p1 as the caller passed it (may be lo or hi — folds normalize).
    return c.json({
      perspectivePlayerId: p1,
      opponentPlayerId: p2,
      titleId: title,
      series: computeH2H(matches, p1, p2),
      meetings: computeMeetings(matches, p1, p2),
      games: computePairGames(slots, p1, p2).map((g) => ({
        ...g,
        mapName: mapNames.get(`${g.matchId}:${g.gameNumber}`) ?? null,
      })),
      civMatchups: computeCivMatchups(slots, p1, p2),
      civPools: {
        perspective: computeCivStats(slots, p1).map((r) => r.key),
        opponent: computeCivStats(slots, p2).map((r) => r.key),
      },
      otherTitles: computeTitleRecords(allMatches, p1, p2).filter((r) => r.titleId !== title),
    });
  });

  return routes;
}
