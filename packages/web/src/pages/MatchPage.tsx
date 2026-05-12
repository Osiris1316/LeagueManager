import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getMatch, reportMatch, clearMatch } from '../api/client';
import type { GameReport } from '../api/client';
import { useAdmin } from '../context/AdminContext';
import { CIVS, MAPS } from '../data/aoe4';

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
          map_name: MAPS.find(m => m.id === g.map_id)?.name,
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

      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ fontSize: '1.5rem' }}>
          {match.player1_name}
          <span style={{ color: 'var(--color-text-tertiary)', margin: '0 0.5rem', fontWeight: 400 }}>vs</span>
          {match.player2_name}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          {match.tier_name} · Round {match.round_number} · Bo{match.best_of}
          {isComplete && match.winner_name && (
            <span style={{ color: 'var(--color-win)' }}> · {match.winner_name} wins {match.player1_score}–{match.player2_score}</span>
          )}
        </p>
        {(match as any).scheduled_at && !isAdmin && (
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', fontSize: '0.875rem' }}>
            Scheduled: {new Date((match as any).scheduled_at).toLocaleString()}
          </p>
        )}
        {isAdmin && (
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <label htmlFor="scheduled-at" style={{ fontSize: '0.8125rem', color: 'var(--color-text-tertiary)' }}>
              Scheduled
            </label>
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
              style={{
                padding: '0.375rem 0.5rem', background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)',
                color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
              }}
            />
          </div>
        )}
      </header>

      {submitResult && (
        <div role="status" style={{
          padding: 'var(--space-md)', marginBottom: 'var(--space-lg)',
          background: 'rgba(92, 184, 122, 0.1)', border: '1px solid rgba(92, 184, 122, 0.3)',
          borderRadius: 'var(--border-radius)', color: 'var(--color-win)',
        }}>
          {submitResult}
        </div>
      )}

      {error && (
        <div role="alert" style={{
          padding: 'var(--space-md)', marginBottom: 'var(--space-lg)',
          background: 'rgba(212, 92, 92, 0.1)', border: '1px solid rgba(212, 92, 92, 0.3)',
          borderRadius: 'var(--border-radius)', color: 'var(--color-loss)',
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {games.map((game, index) => {
          const gameNum = index + 1;
          const existingGame = data.games.find(g => g.game_number === gameNum);
          const hasResult = !!existingGame?.winner_id;
          const isDisabledForAdmin = isAdmin && gameNum > clinchAfter;

          return (
            <div key={index} className="card" style={{ opacity: isDisabledForAdmin ? 0.4 : 1 }}>
              <h3 style={{
                fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-md)',
              }}>
                Game {gameNum}
              </h3>

              <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                {/* Map */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span style={labelStyle}>Map</span>
                  {isAdmin && !isDisabledForAdmin ? (
                    <select value={game.map_id} onChange={e => updateGame(index, 'map_id', e.target.value)}
                      style={selectStyle} aria-label={`Game ${gameNum} map`}>
                      <option value="">— Select —</option>
                      {MAPS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  ) : (
                    <span style={valueStyle(hasResult)}>{existingGame?.map_name ?? 'TBD'}</span>
                  )}
                </div>

                {/* Civs */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span style={labelStyle}>{match.player1_name}</span>
                    {isAdmin && !isDisabledForAdmin ? (
                      <select value={game.player1_civ_id}
                        onChange={e => updateGame(index, 'player1_civ_id', e.target.value)}
                        style={selectStyle} aria-label={`Game ${gameNum} ${match.player1_name} civ`}>
                        <option value="">— Select —</option>
                        {CIVS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span style={valueStyle(hasResult)}>{existingGame?.player1_civ ?? 'TBD'}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                    <span style={labelStyle}>{match.player2_name}</span>
                    {isAdmin && !isDisabledForAdmin ? (
                      <select value={game.player2_civ_id}
                        onChange={e => updateGame(index, 'player2_civ_id', e.target.value)}
                        style={selectStyle} aria-label={`Game ${gameNum} ${match.player2_name} civ`}>
                        <option value="">— Select —</option>
                        {CIVS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <span style={valueStyle(hasResult)}>{existingGame?.player2_civ ?? 'TBD'}</span>
                    )}
                  </div>
                </div>

                {/* Winner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <span style={labelStyle}>Winner</span>
                  {isAdmin && !isDisabledForAdmin ? (
                    <div style={{ display: 'flex', gap: 'var(--space-sm)', flex: 1 }}>
                      <button type="button" onClick={() => updateGame(index, 'winner_id', match.player1_id)}
                        style={{ ...winnerBtnStyle, ...(game.winner_id === match.player1_id ? winnerActiveStyle : {}) }}
                        aria-pressed={game.winner_id === match.player1_id}>
                        {match.player1_name}
                      </button>
                      <button type="button" onClick={() => updateGame(index, 'winner_id', match.player2_id)}
                        style={{ ...winnerBtnStyle, ...(game.winner_id === match.player2_id ? winnerActiveStyle : {}) }}
                        aria-pressed={game.winner_id === match.player2_id}>
                        {match.player2_name}
                      </button>
                    </div>
                  ) : (
                    <span style={{
                      ...valueStyle(hasResult),
                      color: hasResult ? 'var(--color-win)' : undefined,
                      fontWeight: hasResult ? 600 : 400,
                    }}>
                      {hasResult
                        ? (existingGame!.winner_id === match.player1_id ? match.player1_name : match.player2_name)
                        : 'TBD'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
          <button onClick={handleSubmit} disabled={submitting || clearing}
            style={{
              padding: 'var(--space-sm) var(--space-xl)',
              background: submitting ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
              color: 'var(--color-bg)', border: 'none', borderRadius: 'var(--border-radius-sm)',
              fontWeight: 600, fontSize: '0.9375rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
            }}>
            {submitting ? 'Submitting…' : isComplete ? 'Update Results' : 'Submit Results'}
          </button>

          {hasAnyResults && (
            <button onClick={handleClear} disabled={submitting || clearing}
              style={{
                padding: 'var(--space-sm) var(--space-lg)',
                background: 'transparent', color: 'var(--color-loss)',
                border: '1px solid var(--color-loss)', borderRadius: 'var(--border-radius-sm)',
                fontSize: '0.875rem',
                cursor: clearing ? 'not-allowed' : 'pointer',
              }}>
              {clearing ? 'Clearing…' : 'Clear Results'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8125rem', color: 'var(--color-text-tertiary)', minWidth: '5rem', flexShrink: 0,
};

function valueStyle(hasValue: boolean): React.CSSProperties {
  return {
    fontSize: '0.9375rem',
    color: hasValue ? 'var(--color-text)' : 'var(--color-text-tertiary)',
    fontStyle: hasValue ? 'normal' : 'italic',
  };
}

const selectStyle: React.CSSProperties = {
  flex: 1, padding: '0.375rem 0.5rem', background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)',
  color: 'var(--color-text)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', appearance: 'auto',
};

const winnerBtnStyle: React.CSSProperties = {
  flex: 1, padding: '0.375rem 0.75rem', background: 'var(--color-bg-surface)',
  border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius-sm)',
  color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem',
  fontWeight: 500, cursor: 'pointer',
};

const winnerActiveStyle: React.CSSProperties = {
  background: 'rgba(92, 184, 122, 0.15)', borderColor: 'var(--color-win)',
  color: 'var(--color-win)', fontWeight: 600,
};