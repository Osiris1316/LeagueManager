import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlayer } from '../api/client';
import type { PlayerDetailResponse } from '../api/client';

export function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [data, setData] = useState<PlayerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const id = parseInt(playerId ?? '', 10);
        if (isNaN(id)) throw new Error('Invalid player ID');
        const result = await getPlayer(id);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load player');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [playerId]);

  if (loading) {
    return <div className="loading" role="status" aria-live="polite">Loading player…</div>;
  }

  if (error || !data) {
    return <div role="alert"><p>{error ?? 'Player not found'}</p></div>;
  }

  const { player, tierAssignment, matches } = data;
  const tierId = tierAssignment?.tier_id.replace('code_', '') ?? '';

  // Compute player's record from their matches
  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    if (m.status !== 'complete') continue;
    if (m.winner_id === player.id) wins++;
    else losses++;
  }

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/players" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          ← All Players
        </Link>
      </nav>

      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1>{player.display_name}</h1>
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', marginTop: 'var(--space-sm)' }}>
          {tierAssignment && (
            <span className={`badge badge--${tierId}`}>
              {tierAssignment.tier_name}
            </span>
          )}
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {wins}W – {losses}L
          </span>
        </div>
      </header>

      <section aria-labelledby="match-history-heading">
        <h2 id="match-history-heading" style={{ marginBottom: 'var(--space-md)' }}>
          Match History
        </h2>

        {matches.length === 0 ? (
          <p style={{ color: 'var(--color-text-secondary)' }}>No matches yet.</p>
        ) : (
          <div className="match-list">
            {matches.map(match => {
              const isP1 = match.player1_id === player.id;
              const opponent = isP1 ? match.player2_name : match.player1_name;
              const opponentId = isP1 ? match.player2_id : match.player1_id;
              const playerScore = isP1 ? match.player1_score : match.player2_score;
              const opponentScore = isP1 ? match.player2_score : match.player1_score;
              const won = match.winner_id === player.id;
              const isComplete = match.status === 'complete';

              return (
                <div key={match.id} className="match-card">
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-tertiary)',
                    minWidth: '2rem',
                  }}>
                    R{match.round_number}
                  </span>

                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem' }}>
                    vs
                  </span>

                  <Link
                    to={`/player/${opponentId}`}
                    style={{ flex: 1 }}
                  >
                    {opponent}
                  </Link>

                  {isComplete ? (
                    <>
                      <span
                        className="match-card__score"
                        style={{ color: won ? 'var(--color-win)' : 'var(--color-loss)' }}
                      >
                        {playerScore}–{opponentScore}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: won
                            ? 'rgba(92, 184, 122, 0.15)'
                            : 'rgba(212, 92, 92, 0.15)',
                          color: won ? 'var(--color-win)' : 'var(--color-loss)',
                        }}
                      >
                        {won ? 'W' : 'L'}
                      </span>
                    </>
                  ) : (
                    <span className="badge badge--pending">Pending</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
