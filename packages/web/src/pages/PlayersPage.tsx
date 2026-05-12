import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers } from '../api/client';
import type { Player } from '../api/client';

export function PlayersPage() {
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

  if (loading) {
    return <div className="loading" role="status" aria-live="polite">Loading players…</div>;
  }

  return (
    <div>
      <h1 style={{ marginBottom: 'var(--space-lg)' }}>Players</h1>
      <div className="card">
        <div className="table-wrap">
          <table aria-label="All league players">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Joined</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/player/${p.id}`}>{p.display_name}</Link>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    {new Date(p.created_at + 'Z').toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
