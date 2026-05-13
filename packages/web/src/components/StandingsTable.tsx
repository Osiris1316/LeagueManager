import { Link } from 'react-router-dom';
import type { PlayerStanding } from '../api/client';

interface StandingsTableProps {
  standings: PlayerStanding[];
  tierId: string;
}

export function StandingsTable({ standings, tierId }: StandingsTableProps) {
  if (standings.length === 0) {
    return <p className="standings-table__empty">No players assigned.</p>;
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table
          className="standings-table"
          aria-label={`Standings for ${tierId.replace('_', ' ').toUpperCase()}`}
        >
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Player</th>
              <th scope="col" className="num">W</th>
              <th scope="col" className="num">L</th>
              <th scope="col" className="num" title="Games won – games lost">+/−</th>
              <th scope="col" className="num" title="Individual games won">GW</th>
              <th scope="col" className="num" title="Individual games lost">GL</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const diffClass = row.game_diff > 0
                ? 'num--positive'
                : row.game_diff < 0
                  ? 'num--negative'
                  : '';

              return (
                <tr key={row.player_id}>
                  <td className="num" data-label="#">{index +1}</td>
                  <td data-label="Player">
                    <span className="standings-table__position">{index + 1}.</span>{' '}
                    <Link to={`/player/${row.player_id}`}>
                      {row.display_name}
                    </Link>
                  </td>
                  <td className={`num ${row.wins > 0 ? 'num--positive' : ''}`} data-label="W">
                    {row.wins}
                  </td>
                  <td className={`num ${row.losses > 0 ? 'num--negative' : ''}`} data-label="L">
                    {row.losses}
                  </td>
                  <td className={`num ${diffClass}`} data-label="+/−">
                    {row.game_diff > 0 ? `+${row.game_diff}` : row.game_diff}
                  </td>
                  <td className="num" data-label="GW">{row.match_wins}</td>
                  <td className="num" data-label="GL">{row.match_losses}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}