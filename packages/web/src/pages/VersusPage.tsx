import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TITLES, isEventSeason, orderSeasonsChronologically, titleById } from '@league-manager/core';
import { getH2H, getPlayers, type H2HResponse, type Player, type Season } from '../api/client';
import { useSeasons } from '../context/SeasonsContext';
import { useFollow } from '../context/FollowContext';
import { History } from '../components/head-to-head/HeadToHead';
import { FieldRail } from '../components/versus/FieldRail';
import { PlayerSelect, SwapButton } from '../components/versus/PlayerSelect';

/**
 * Versus: pick any two players, a game, and where to start counting from.
 * The body is the match page's head to head for that pair and scope; on wide
 * screens each player's corner (their record against everyone) flanks it.
 * The picks live in the URL (?p1=&p2=&game=&since=), so a comparison is a
 * link. The followed player fills the left side until someone else is picked.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Since S3 · Jul 2026" (a showmatch or event uses its name). */
function eventLabel(s: Season): string {
  const name = (s.format === 'showmatch' || isEventSeason(s)) && s.name ? s.name : `S${s.season_index}`;
  const d = s.started_at ? new Date(`${s.started_at.slice(0, 10)}T12:00:00`) : null;
  return `Since ${name}${d ? ` · ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : ''}`;
}

type LoadState = { status: 'idle' | 'loading' | 'error' } | { status: 'ready'; data: H2HResponse };

export function VersusPage() {
  const [params, setParams] = useSearchParams();
  const { seasons } = useSeasons();
  const { followedPlayerId } = useFollow();
  const [players, setPlayers] = useState<Player[]>([]);
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  const num = (k: string) => {
    const n = Number.parseInt(params.get(k) ?? '', 10);
    return Number.isFinite(n) ? n : null;
  };
  const p1 = num('p1') ?? followedPlayerId ?? null;
  const p2 = num('p2');

  // Games with at least one live season; staged ('pending') seasons stay hidden.
  const live = useMemo(() => seasons.filter((s) => s.status !== 'pending'), [seasons]);
  const games = TITLES.filter((t) => live.some((s) => s.title_id === t.id));
  const game = params.get('game') ?? live.find((s) => s.status === 'active')?.title_id ?? games[0]?.id ?? 'aoe4';

  // Every event in this game, newest first, in the same order the API uses.
  const events = useMemo(() => {
    const inGame = live.filter((s) => s.title_id === game);
    const order = orderSeasonsChronologically(
      inGame.map((s) => ({ id: s.id, startedAt: s.started_at, seasonNumber: s.season_number })),
    );
    return order.reverse().map((id) => inGame.find((s) => s.id === id)!);
  }, [live, game]);
  // A since that isn't one of this game's events (an old link) means all seasons.
  const sinceAsked = num('since');
  const since = events.some((s) => s.id === sinceAsked) ? sinceAsked : null;

  useEffect(() => {
    getPlayers()
      .then((list) => setPlayers([...list].sort((a, b) => a.display_name.localeCompare(b.display_name))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (p1 == null || p2 == null || p1 === p2) { setState({ status: 'idle' }); return; }
    let cancelled = false;
    setState({ status: 'loading' });
    getH2H(p1, p2, game, since)
      .then((data) => { if (!cancelled) setState({ status: 'ready', data }); })
      .catch(() => { if (!cancelled) setState({ status: 'error' }); });
    return () => { cancelled = true; };
  }, [p1, p2, game, since]);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k); else next.set(k, v);
    }
    setParams(next, { replace: true });
  };

  const nameOf = (id: number | null) => players.find((p) => p.id === id)?.display_name ?? '';
  const swap = () => set({ p1: p2 != null ? String(p2) : null, p2: p1 != null ? String(p1) : null });
  const title = titleById(game);
  const sinceEvent = events.find((s) => s.id === since);
  const sinceName = sinceEvent
    ? (sinceEvent.format === 'showmatch' || isEventSeason(sinceEvent)) && sinceEvent.name
      ? sinceEvent.name
      : `S${sinceEvent.season_index}`
    : null;
  const scopeText = `${title?.shortName ?? game}${sinceName ? ` since ${sinceName}` : ''}`;
  // Civ flags exist for AoE4 only so far; other games show records without them.
  const hasCivs = game === 'aoe4';

  const leftPicker = (
    <PlayerSelect id="vs-p1" side="left" players={players} value={p1} exclude={p2}
      onChange={(id) => set({ p1: String(id) })} />
  );
  const rightPicker = (
    <PlayerSelect id="vs-p2" side="right" players={players} value={p2} exclude={p1}
      onChange={(id) => set({ p2: String(id) })} />
  );
  const data = state.status === 'ready' ? state.data : null;

  return (
    <div className="vs">
      <div className="page-head vs__head">
        <div className="page-head__title"><h1>Versus</h1></div>
        <div className="vs-scope">
          <label className="sr-only" htmlFor="vs-game">Game</label>
          <select id="vs-game" className="season-picker__select" value={game}
            onChange={(e) => set({ game: e.target.value, since: null })}>
            {games.map((t) => <option key={t.id} value={t.id}>{t.shortName}</option>)}
          </select>
          <label className="sr-only" htmlFor="vs-since">Since</label>
          <select id="vs-since" className="season-picker__select" value={since ?? ''}
            onChange={(e) => set({ since: e.target.value || null })}>
            <option value="">All seasons</option>
            {events.map((s) => <option key={s.id} value={s.id}>{eventLabel(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="vs__grid">
        <FieldRail side="left" picker={leftPicker} record={data?.field?.perspective ?? null} showCivs={hasCivs} />

        <div className="h2h vs__col">
          <div className="vs-pickers">
            {leftPicker}
            <SwapButton onSwap={swap} />
            {rightPicker}
          </div>

          {state.status === 'idle' && <p className="h2h__empty">Pick two players to compare them.</p>}
          {state.status === 'loading' && <p className="h2h__status" role="status">Loading…</p>}
          {state.status === 'error' && <p className="h2h__status">Couldn’t load this comparison right now.</p>}
          {data && (
            <History
              data={data}
              leftName={nameOf(p1)}
              rightName={nameOf(p2)}
              titleName={title?.name ?? null}
              hasCivCatalog={hasCivs}
              showField
              emptyText={`Never met in ${scopeText}`}
              summaryCentre={<SwapButton onSwap={swap} className="h2h-c vs-swap--summary" />}
              afterSummary={data.otherTitles.length > 0 ? (
                <p className="vs-also">
                  Also met in{' '}
                  {data.otherTitles.map((r, i) => (
                    <span key={r.titleId}>
                      {i > 0 && ', '}
                      <button type="button" className="vs-also__link" onClick={() => set({ game: r.titleId, since: null })}>
                        {titleById(r.titleId)?.name ?? r.titleId} {r.wins}–{r.losses}
                      </button>
                    </span>
                  ))}
                </p>
              ) : undefined}
            />
          )}
        </div>

        <FieldRail side="right" picker={rightPicker} record={data?.field?.opponent ?? null} showCivs={hasCivs} />
      </div>
    </div>
  );
}
