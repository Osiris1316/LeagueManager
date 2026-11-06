import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers } from '../api/client';
import type { Player } from '../api/client';
import { useFollow } from '../context/FollowContext';

export function SettingsPage() {
  const { followedPlayerId, follow, unfollow } = useFollow();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPlayers()
      .then(data => { if (!cancelled) setPlayers(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1>Settings</h1>
      </header>

      <section aria-labelledby="follow-heading">
        <div className="section-header">
          <h2 id="follow-heading">Follow a player</h2>
          {followedPlayerId != null && (
            <button className="settings-clear" onClick={unfollow}>
              Clear
            </button>
          )}
        </div>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
          Click a player's name to follow them. Their matches then appear under Your matches,
          sorted into overdue, this round and coming up, so you can find your next game without
          hunting for it. You can also follow someone from their player page.
        </p>

        {loading ? (
          <div className="loading" role="status" aria-live="polite">Loading players…</div>
        ) : (
          <div className="card">
            <ul className="settings-player-list">
              {players.map(p => {
                const isFollowed = followedPlayerId === p.id;
                return (
                  <li
                    key={p.id}
                    className={`settings-player${isFollowed ? ' settings-player--following' : ''}`}
                  >
                    <button
                      className={`settings-player__name${isFollowed ? ' settings-player__name--following' : ''}`}
                      onClick={() => (isFollowed ? unfollow() : follow(p.id))}
                      aria-pressed={isFollowed}
                      title={isFollowed
                        ? `Following ${p.display_name} — click to stop following`
                        : `Follow ${p.display_name}`}
                    >
                      {p.display_name}
                    </button>
                    <Link to={`/player/${p.id}`} className="settings-player__view">
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
