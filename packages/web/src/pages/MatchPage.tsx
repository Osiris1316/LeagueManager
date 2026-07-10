import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch, reportMatch, clearMatch } from '../api/client';
import type { GameReport } from '../api/client';
import { useAdmin } from '../context/AdminContext';
import { CIVS, MAPS } from '../data/aoe4';
import { RulesModal } from '../components/RulesModal';
import { CivFlag } from '../components/CivFlag';

interface MatchData {
  match: {
    id: number;
    player1_id: number;
    player2_id: number;
    player1_name: string;
    player2_name: string;
    best_of: number;
    status: string;
    tier_name: string;
    civ_rule: string;
    player1_score: number;
    player2_score: number;
    winner_name: string | null;
    round_number: number | null;
    season_id: number;
    tier_id: string;
  };
  games: {
    game_number: number;
    map_name: string | null;
    map_id: string | null;
    player1_civ: string | null;
    player1_civ_id: string | null;
    player2_civ: string | null;
    player2_civ_id: string | null;
    winner_id: number | null;
  }[];
  rules_summary: string | null;
  presets: {
    draft_type: string;
    preset_id: string | null;
    preset_url: string | null;
    label: string | null;
  }[];
  available_maps: {
    id: string;
    name: string
  }[];
}

interface GameInput {
  map_id: string;
  player1_civ_id: string;
  player2_civ_id: string;
  winner_id: number | null;
}

function emptyGame(): GameInput {
  return { map_id: '', player1_civ_id: '', player2_civ_id: '', winner_id: null };
}

export function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { isAdmin } = useAdmin();

  const [data, setData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [games, setGames] = useState<GameInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const id = parseInt(matchId ?? '', 10);
        if (isNaN(id)) throw new Error('Invalid match ID');
        const result = await getMatch(id);
        if (!cancelled) {
          setData(result as unknown as MatchData);
          const count = result.match.best_of;
          const existing = result.games as MatchData['games'];
          const inputs: GameInput[] = [];
          for (let i = 0; i < count; i++) {
            const eg = existing.find(g => g.game_number === i + 1);
            if (eg) {
              inputs.push({
                map_id: eg.map_id ?? '',
                player1_civ_id: eg.player1_civ_id ?? '',
                player2_civ_id: eg.player2_civ_id ?? '',
                winner_id: eg.winner_id,
              });
            } else {
              inputs.push(emptyGame());
            }
          }
          setGames(inputs);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [matchId]);

  function updateGame(index: number, field: keyof GameInput, value: string | number | null) {
    setGames(prev => {
      const next = [...prev];
      next[index] = { ...next[index]!, [field]: value };
      return next;
    });
  }

  async function handleSubmit() {
    if (!data) return;
    setSubmitting(true);
    setSubmitResult(null);
    setError(null);

    try {
      const match = data.match;
      const winsNeeded = Math.ceil(match.best_of / 2);
      const gameReports: GameReport[] = [];
      let p1Wins = 0;
      let p2Wins = 0;

      for (let i = 0; i < games.length; i++) {
        const g = games[i]!;
        if (!g.winner_id) continue;
        if (p1Wins >= winsNeeded || p2Wins >= winsNeeded) break;

        gameReports.push({
          game_number: i + 1,
          map_id: g.map_id || undefined,
          map_name: data.available_maps.find(m => m.id === g.map_id)?.name ?? MAPS.find(m => m.id === g.map_id)?.name,
          player1_civ_id: g.player1_civ_id || undefined,
          player1_civ: CIVS.find(c => c.id === g.player1_civ_id)?.name,
          player2_civ_id: g.player2_civ_id || undefined,
          player2_civ: CIVS.find(c => c.id === g.player2_civ_id)?.name,
          winner_id: g.winner_id,
        });

        if (g.winner_id === match.player1_id) p1Wins++;
        else p2Wins++;
      }

      if (gameReports.length === 0) {
        setError('Select a winner for at least one game');
        setSubmitting(false);
        return;
      }

      const result = await reportMatch(match.id, gameReports);
      setSubmitResult(result.message);

      const updated = await getMatch(match.id);
      setData(updated as unknown as MatchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClear() {
    if (!data) return;
    if (!confirm('Clear all results for this match? This cannot be undone.')) return;

    setClearing(true);
    setSubmitResult(null);
    setError(null);

    try {
      await clearMatch(data.match.id);
      setSubmitResult('Results cleared');

      const updated = await getMatch(data.match.id);
      setData(updated as unknown as MatchData);

      setGames(Array.from({ length: data.match.best_of }, () => emptyGame()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear');
    } finally {
      setClearing(false);
    }
  }

  if (loading) {
    return <div className="loading" role="status">Loading match…</div>;
  }

  if (!data) {
    return <div role="alert"><p>{error ?? 'Match not found'}</p></div>;
  }

  const { match } = data;
  const isComplete = match.status === 'complete';
  const hasAnyResults = data.games.length > 0;

  let clinchAfter = match.best_of;
  if (isAdmin) {
    const winsNeeded = Math.ceil(match.best_of / 2);
    let p1 = 0;
    let p2 = 0;
    for (let i = 0; i < games.length; i++) {
      const g = games[i]!;
      if (g.winner_id === match.player1_id) p1++;
      if (g.winner_id === match.player2_id) p2++;
      if (p1 >= winsNeeded || p2 >= winsNeeded) {
        clinchAfter = i + 1;
        break;
      }
    }
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          ← Standings
        </Link>
      </nav>

      <header style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="match-header__title">
          <Link to={`/player/${match.player1_id}`} className="game-result__player-link">
            {match.player1_name}
          </Link>
          <span className="match-header__vs">vs</span>
          <Link to={`/player/${match.player2_id}`} className="game-result__player-link">
            {match.player2_name}
          </Link>
        </h1>
        <p className="match-header__meta">
          {match.tier_name} · Round {match.round_number} · Bo{match.best_of}
          {isComplete && match.winner_name && (
            <span className="match-header__result">
              {' · '}{match.winner_name} wins{' '}
              {match.winner_name === match.player1_name
                ? `${match.player1_score}–${match.player2_score}`
                : `${match.player2_score}–${match.player1_score}`}
            </span>
          )}
        </p>
        {(match as any).scheduled_at && !isAdmin && (
          <p className="match-header__meta">
            Scheduled: {new Date((match as any).scheduled_at).toLocaleString()}
          </p>
        )}
        {isAdmin && (
          <div className="schedule-row">
            <label htmlFor="scheduled-at">Scheduled</label>
            <input
              id="scheduled-at"
              type="datetime-local"
              defaultValue={(match as any).scheduled_at ? (match as any).scheduled_at.slice(0, 16) : ''}
              onBlur={async (e) => {
                const value = e.target.value;
                if (!value) return;
                try {
                  const token = sessionStorage.getItem('admin_token');
                  if (!token) return;
                  const base = import.meta.env.VITE_API_BASE_URL ?? '';
                  await fetch(`${base}/api/admin/matches/${match.id}/schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
                    body: JSON.stringify({ scheduled_at: new Date(value).toISOString() }),
                  });
                } catch { /* silent fail for now */ }
              }}
            />
          </div>
        )}
      </header>

      <div className="match-links">
        <button onClick={() => setShowRules(true)} className="match-links__btn">
          Rules
        </button>
        {data.presets
          .filter((p) => p.preset_url)
          .sort((a, b) => {
            const order: Record<string, number> = { map: 0, civ_main: 1, civ_game: 2 };
            return (order[a.draft_type] ?? 9) - (order[b.draft_type] ?? 9);
          })
          .map((preset) => (
            <a key={preset.draft_type} href={preset.preset_url!}
              target="_blank" rel="noopener noreferrer" className="match-links__btn">
              {preset.label ?? preset.draft_type}
            </a>
          ))}
      </div>

      {submitResult && (
        <div role="status" className="banner banner--success">{submitResult}</div>
      )}

      {error && (
        <div role="alert" className="banner banner--error">{error}</div>
      )}

      <div className="game-list">
        {games.map((game, index) => {
          const gameNum = index + 1;
          const existingGame = data.games.find(g => g.game_number === gameNum);
          const hasResult = !!existingGame?.winner_id;
          const isDisabledForAdmin = isAdmin && gameNum > clinchAfter;

          return (
            <div key={index} className={`game-card${isDisabledForAdmin ? ' game-card--disabled' : ''}`}>
              {isAdmin && (
                <div className="game-card__header">
                  <span>Game {gameNum}</span>
                </div>
              )}

              {isAdmin ? (
                <div className="game-edit">
                  <div className="game-edit__row">
                    <span className="game-edit__label">Map</span>
                    {!isDisabledForAdmin ? (
                      <select value={game.map_id} onChange={e => updateGame(index, 'map_id', e.target.value)}
                        className="game-edit__select" aria-label={`Game ${gameNum} map`}>
                        <option value="">— Select —</option>
                        {data.available_maps.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    ) : (
                      <span className="game-result__tbd">{existingGame?.map_name ?? 'TBD'}</span>
                    )}
                  </div>

                  <div className="game-edit__civs">
                    <div className="game-edit__row">
                      <span className="game-edit__label">{match.player1_name}</span>
                      {!isDisabledForAdmin ? (
                        <select value={game.player1_civ_id}
                          onChange={e => updateGame(index, 'player1_civ_id', e.target.value)}
                          className="game-edit__select" aria-label={`Game ${gameNum} ${match.player1_name} civ`}>
                          <option value="">— Select —</option>
                          {CIVS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span className="game-result__tbd">{existingGame?.player1_civ ?? 'TBD'}</span>
                      )}
                    </div>

                    <div className="game-edit__row">
                      <span className="game-edit__label">{match.player2_name}</span>
                      {!isDisabledForAdmin ? (
                        <select value={game.player2_civ_id}
                          onChange={e => updateGame(index, 'player2_civ_id', e.target.value)}
                          className="game-edit__select" aria-label={`Game ${gameNum} ${match.player2_name} civ`}>
                          <option value="">— Select —</option>
                          {CIVS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      ) : (
                        <span className="game-result__tbd">{existingGame?.player2_civ ?? 'TBD'}</span>
                      )}
                    </div>
                  </div>

                  <div className="game-edit__row">
                    <span className="game-edit__label">Winner</span>
                    {!isDisabledForAdmin ? (
                      <div className="game-edit__winners">
                        <button type="button" onClick={() => updateGame(index, 'winner_id', match.player1_id)}
                          className={`btn-winner${game.winner_id === match.player1_id ? ' btn-winner--active' : ''}`}
                          aria-pressed={game.winner_id === match.player1_id}>
                          {match.player1_name}
                        </button>
                        <button type="button" onClick={() => updateGame(index, 'winner_id', match.player2_id)}
                          className={`btn-winner${game.winner_id === match.player2_id ? ' btn-winner--active' : ''}`}
                          aria-pressed={game.winner_id === match.player2_id}>
                          {match.player2_name}
                        </button>
                      </div>
                    ) : (
                      <span className="game-result__tbd">
                        {hasResult
                          ? (existingGame!.winner_id === match.player1_id ? match.player1_name : match.player2_name)
                          : 'TBD'}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="game-result">
                  {hasResult ? (
                    <>
                      <span className={`game-result__player game-result__player--right${existingGame!.winner_id === match.player1_id ? ' game-result__player--winner' : ''}`}>
                        <Link to={`/player/${match.player1_id}`} className="game-result__player-link"
                          onClick={e => e.stopPropagation()}>
                          {match.player1_name}
                        </Link>
                        <CivFlag civId={existingGame?.player1_civ_id} showName={false} />
                      </span>

                      <span className="game-result__map">{existingGame?.map_name ?? '—'}</span>

                      <span className={`game-result__player${existingGame!.winner_id === match.player2_id ? ' game-result__player--winner' : ''}`}>
                        <CivFlag civId={existingGame?.player2_civ_id} showName={false} />
                        <Link to={`/player/${match.player2_id}`} className="game-result__player-link"
                          onClick={e => e.stopPropagation()}>
                          {match.player2_name}
                        </Link>
                      </span>
                    </>
                  ) : (
                    <span className="game-result__tbd">Not yet played</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div className="match-actions">
          <button onClick={handleSubmit} disabled={submitting || clearing} className="btn-submit">
            {submitting ? 'Submitting…' : isComplete ? 'Update Results' : 'Submit Results'}
          </button>

          {hasAnyResults && (
            <button onClick={handleClear} disabled={submitting || clearing} className="btn-clear">
              {clearing ? 'Clearing…' : 'Clear Results'}
            </button>
          )}
        </div>
      )}

      {showRules && (
        <RulesModal
          seasonId={match.season_id}
          tierId={match.tier_id}
          tierName={match.tier_name}
          onClose={() => setShowRules(false)}
        />
      )}
    </div>
  );
}