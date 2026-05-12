import { Link } from 'react-router-dom';
import type { PlayerStanding } from '../api/client';

interface StandingsTableProps {
  standings: PlayerStanding[];
  tierId: string;
}

export function StandingsTable({ standings, tierId }: StandingsTableProps) {
  if (standings.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No players assigned.</p>;
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table aria-label={`Standings for ${tierId.replace('_', ' ').toUpperCase()}`}>
          <thead>
            <tr>
              <th scope="col" style={{ width: '3rem' }}>#</th>
              <th scope="col">Player</th>
              <th scope="col" className="num">W</th>
              <th scope="col" className="num">L</th>
              <th scope="col" className="num" title="Games won – games lost">+/−</th>
              <th scope="col" className="num" title="Individual games won">GW</th>
              <th scope="col" className="num" title="Individual games lost">GL</th>
            </tr>
          </thead>
          <tbody>
            {standings.map(row => (
              <tr key={row.player_id}>
                <td className="num">{row.rank}</td>
                <td>
                  <Link to={`/player/${row.player_id}`}>
                    {row.display_name}
                  </Link>
                </td>
                <td className="num" style={{ color: row.wins > 0 ? 'var(--color-win)' : undefined }}>
                  {row.wins}
                </td>
                <td className="num" style={{ color: row.losses > 0 ? 'var(--color-loss)' : undefined }}>
                  {row.losses}
                </td>
                <td className="num" style={{
                  color: row.game_diff > 0
                    ? 'var(--color-win)'
                    : row.game_diff < 0
                    ? 'var(--color-loss)'
                    : undefined
                }}>
                  {row.game_diff > 0 ? `+${row.game_diff}` : row.game_diff}
                </td>
                <td className="num">{row.match_wins}</td>
                <td className="num">{row.match_losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
