import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { QueueGroup } from '@league-manager/core';
import type { PlayerQueue } from '../../hooks/usePlayerQueue';
import { useSeasonLookup } from '../../context/SeasonsContext';
import { MatchCard } from '../MatchCard';
import { GROUP_LABELS, ordinal } from './format';

/** How many "coming up" matches show before the rest fold away. */
const UPCOMING_VISIBLE = 3;

const GROUP_ORDER: QueueGroup[] = ['overdue', 'current', 'upcoming'];

/**
 * The full "your matches" list used by the side panel and the bottom sheet:
 * a standing line per league, then overdue, this round and coming up.
 */
export function QueueList({ data }: { data: PlayerQueue }) {
  const seasonById = useSeasonLookup();
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  if (data.status === 'loading' && data.matches.length === 0) {
    return <p className="ym-note">Loading matches…</p>;
  }
  if (data.status === 'error') {
    return <p className="ym-note">Couldn't load matches. Try again in a moment.</p>;
  }

  const { queue } = data;
  const total = queue.overdue.length + queue.current.length + queue.upcoming.length;

  return (
    <div className="ym-list">
      {data.standings.length > 0 && (
        <ul className="ym-standings" role="list" aria-label="Standings">
          {data.standings.map(line => (
            <li key={`${line.seasonId}-${line.tierName}`}>
              <Link
                className="ym-standings__line"
                to={`/season/${line.seasonId}#standing-${data.playerId}`}
              >
                <span className="ym-standings__tag">{line.seasonTag}</span>
                <span>{line.tierName}</span>
                <span className="ym-standings__pos">{ordinal(line.position)}</span>
                <span className="ym-standings__record">{line.wins}–{line.losses}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {total === 0 && <p className="ym-note ym-note--done">All caught up. Nothing left to play.</p>}

      {GROUP_ORDER.map(group => {
        const all = queue[group];
        if (all.length === 0) return null;
        const folded = group === 'upcoming' && !showAllUpcoming && all.length > UPCOMING_VISIBLE;
        const shown = folded ? all.slice(0, UPCOMING_VISIBLE) : all;
        return (
          <section key={group} className={`ym-group ym-group--${group}`} aria-label={GROUP_LABELS[group]}>
            <h3 className="ym-group__title">
              <span className="ym-group__dot" aria-hidden="true" />
              {GROUP_LABELS[group]}
              <span className="ym-group__count">{all.length}</span>
            </h3>
            <div className="match-list">
              {shown.map(match => {
                const season = seasonById(match.season_id);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tierAccent={match.tier_id.replace('code_', '') as 's' | 'a' | 'b'}
                    season={season}
                  />
                );
              })}
            </div>
            {folded && (
              <button type="button" className="ym-more" onClick={() => setShowAllUpcoming(true)}>
                Show {all.length - UPCOMING_VISIBLE} more
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
