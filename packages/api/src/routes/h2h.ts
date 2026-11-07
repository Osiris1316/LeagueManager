import { Hono } from 'hono';
import {
  explodeToSlotViews,
  computeH2H,
  computeMeetings,
  computePairGames,
  computeCivMatchups,
  computeCivStats,
  computeFieldRecord,
  computeTitleRecords,
  orderSeasonsChronologically,
  rowToEnrichedGame,
  rowToEnrichedMatch,
  seasonIdsSince,
} from '@league-manager/core';

interface SeasonRow {
  id: number;
  title_id: string;
  season_number: number;
  season_index: number | null;
  status: string;
  started_at: string | null;
}

interface TierRow {
  player_id: number;
  season_id: number;
  tier_name: string;
}

export function h2hRoutes<E extends { Bindings: { DB: D1Database } }>() {
  const routes = new Hono<E>();

  // Head-to-head between two players, from p1's perspective.
  //
  //   GET /api/h2h?p1=X&p2=Y                     every title together (the original behaviour)
  //   GET /api/h2h?p1=X&p2=Y&title=aoe4          one game title only (the match page)
  //   GET /api/h2h?p1=X&p2=Y&title=aoe4&since=3  that title, from season 3 onward (Versus)
  //
  // Scope (title, since) is applied as a pre-filter on the fetched rows, never
  // inside a fold, so every number below is a fold over the same filtered
  // arrays. "Since" follows the seasons' start dates (orderSeasonsChronologically),
  // the same order the Versus page's Since list uses. The pair's other titles
  // are summarised in `otherTitles`, all time. `field` is each player's record
  // against everyone in the same scope, plus their latest tier in the title.
  routes.get('/h2h', async (c) => {
    const db = c.env.DB;
    const p1 = parseInt(c.req.query('p1') ?? '', 10);
    const p2 = parseInt(c.req.query('p2') ?? '', 10);
    const title = c.req.query('title') || null;
    const sinceRaw = c.req.query('since') || null;
    const since = sinceRaw === null ? null : parseInt(sinceRaw, 10);

    if (isNaN(p1) || isNaN(p2)) return c.json({ error: 'Invalid player IDs' }, 400);
    if (p1 === p2) return c.json({ error: 'Players must differ' }, 400);
    if (since !== null && isNaN(since)) return c.json({ error: 'Invalid since season' }, 400);
    if (since !== null && title === null) return c.json({ error: 'since needs a title' }, 400);

    const [matchRows, gameRows, seasonRows, tierRows] = await Promise.all([
      // Every match either player has played, in every title. The pair's own
      // meetings are a subset (the folds pick them out); the rest give each
      // player's record against everyone.
      db.prepare(`
          SELECT m.season_id, s.title_id, s.season_index, m.tier_id, m.id AS match_id,
                 m.round_number AS round, m.best_of,
                 m.player1_id, m.player2_id, m.player1_score, m.player2_score,
                 m.winner_id, m.completed_at
          FROM matches m
          JOIN seasons s ON s.id = m.season_id
          WHERE m.player1_id IN (?, ?) OR m.player2_id IN (?, ?)
        `)
        .bind(p1, p2, p1, p2)
        .all(),
      // Every completed game either player has played, against anyone: the
      // pair's games, each player's civs (the matrix's "Everything each has
      // played") and their most played civs.
      db.prepare(`
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
        .bind(p1, p2, p1, p2)
        .all(),
      db.prepare('SELECT id, title_id, season_number, season_index, status, started_at FROM seasons').all(),
      db.prepare(`
          SELECT ta.player_id, ta.season_id, t.display_name AS tier_name
          FROM tier_assignments ta
          JOIN tiers t ON t.id = ta.tier_id
          WHERE ta.player_id IN (?, ?)
        `)
        .bind(p1, p2)
        .all(),
    ]);

    const seasons = seasonRows.results as unknown as SeasonRow[];
    const titleSeasons = title ? seasons.filter((s) => s.title_id === title) : seasons;
    const ordered = orderSeasonsChronologically(
      titleSeasons.map((s) => ({ id: s.id, startedAt: s.started_at, seasonNumber: s.season_number })),
    );
    if (since !== null && !ordered.includes(since)) {
      return c.json({ error: 'since must be a season of this title' }, 400);
    }
    const sinceIds = seasonIdsSince(ordered, since);
    const inScope = (r: { titleId: string | null; seasonId: number }) =>
      (title === null || r.titleId === title) && (sinceIds === null || sinceIds.has(r.seasonId));

    const rawGames = gameRows.results as Record<string, unknown>[];
    const allMatches = (matchRows.results as Record<string, unknown>[]).map(rowToEnrichedMatch);
    const allGames = rawGames.map(rowToEnrichedGame);

    const matches = allMatches.filter(inScope);
    const slots = explodeToSlotViews(allGames.filter(inScope));

    // Each player's latest tier in this title (all titles if none), from live
    // seasons only, so a staged season never shows early. Not limited by since.
    const live = titleSeasons.filter((s) => s.status !== 'pending');
    const tiers = tierRows.results as unknown as TierRow[];
    const tierOf = (playerId: number) => {
      let best: { row: TierRow; pos: number } | null = null;
      for (const row of tiers) {
        if (row.player_id !== playerId) continue;
        const pos = ordered.indexOf(row.season_id);
        if (pos === -1 || !live.some((s) => s.id === row.season_id)) continue;
        if (best === null || pos > best.pos) best = { row, pos };
      }
      if (best === null) return null;
      const season = seasons.find((s) => s.id === best!.row.season_id)!;
      return {
        name: best.row.tier_name,
        seasonId: season.id,
        seasonIndex: season.season_index,
        current: season.status === 'active',
      };
    };

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
      sinceSeasonId: since,
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
      field: {
        perspective: { ...computeFieldRecord(matches, slots, p1), tier: tierOf(p1) },
        opponent: { ...computeFieldRecord(matches, slots, p2), tier: tierOf(p2) },
      },
    });
  });

  return routes;
}
