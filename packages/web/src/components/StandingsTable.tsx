import { Link } from 'react-router-dom';
import type { PlayerStanding } from '../api/client';

interface StandingsTableProps {
  standings: PlayerStanding[];
  tierId: string;
  /**
   * Every match is a Bo1 (an event's group): game columns would only repeat
   * W and L, so they're left out, and the rank comes from the data, so a tie
   * head to head can't break shows as a shared place.
   */
  bo1?: boolean;
}

export function StandingsTable({ standings, tierId, bo1 = false }: StandingsTableProps) {
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
              {!bo1 && (
                <>
                  <th scope="col" className="num" title="Games won – games lost">+/−</th>
                  <th scope="col" className="num" title="Individual games won">GW</th>
                  <th scope="col" className="num" title="Individual games lost">GL</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const diffClass = row.game_diff > 0
                ? 'num--positive'
                : row.game_diff < 0
                  ? 'num--negative'
                  : '';
              const place = bo1 ? row.rank : index + 1;

              return (
                <tr key={row.player_id} id={`standing-${row.player_id}`}>
                  <td className="num" data-label="#">{place}</td>
                  <td data-label="Player">
                    <span className="standings-table__position">{place}.</span>{' '}
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
                  {!bo1 && (
                    <>
                      <td className={`num ${diffClass}`} data-label="+/−">
                        {row.game_diff > 0 ? `+${row.game_diff}` : row.game_diff}
                      </td>
                      <td className="num" data-label="GW">{row.match_wins}</td>
                      <td className="num" data-label="GL">{row.match_losses}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}