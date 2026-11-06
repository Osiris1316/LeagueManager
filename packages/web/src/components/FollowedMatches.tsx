import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { seasonLabelShort } from '@league-manager/core';
import { getPlayer } from '../api/client';
import type { MatchWithPlayers } from '../api/client';
import { useFollow } from '../context/FollowContext';
import { useSeasonLookup, useSeasons } from '../context/SeasonsContext';
import { MatchCard } from './MatchCard';

/**
 * A player's not-yet-finished matches, soonest first.
 * Matches without a scheduled time sort after scheduled ones, then by round.
 */
function upcoming(matches: MatchWithPlayers[]): MatchWithPlayers[] {
  return matches
    .filter(m => m.status !== 'complete')
    .sort((a, b) => {
      const at = a.scheduled_at ? Date.parse(a.scheduled_at) : Number.POSITIVE_INFINITY;
      const bt = b.scheduled_at ? Date.parse(b.scheduled_at) : Number.POSITIVE_INFINITY;
      if (at !== bt) return at - bt;
      return (a.round_number ?? 0) - (b.round_number ?? 0);
    });
}

/** The match id in the current path, e.g. `/match/42`. */
function matchIdFromPath(pathname: string): number | null {
  const match = pathname.match(/^\/match\/(\d+)/);
  return match ? Number.parseInt(match[1]!, 10) : null;
}

export function FollowedMatches() {
  const { followedPlayerId } = useFollow();
  const { seasons, loading: seasonsLoading } = useSeasons();
  const seasonById = useSeasonLookup();
  const location = useLocation();

  const [playerName, setPlayerName] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(false);

  // "Next matches" means every league that is live right now, not just the
  // season on screen: with AoE4 and BW running at once, a player can have
  // matches in both. Pending seasons stay hidden until they go live.
  // The ids are joined into a string so the effect below re-runs only when
  // the set of active seasons actually changes. A fresh array would count as
  // "changed" on every render, because arrays compare by identity, not content.
  const activeKey = seasons
    .filter(s => s.status === 'active')
    .map(s => s.id)
    .join(',');

  useEffect(() => {
    if (followedPlayerId == null || activeKey === '') {
      setPlayerName(null);
      setMatches([]);
      return;
    }

    const activeIds = new Set(activeKey.split(',').map(Number));
    let cancelled = false;
    setLoading(true);

    getPlayer(followedPlayerId)
      .then(detail => {
        if (cancelled) return;
        setPlayerName(detail.player.display_name);
        setMatches(upcoming(detail.matches.filter(m => activeIds.has(m.season_id))));
      })
      .catch(() => {
        if (!cancelled) {
          setPlayerName(null);
          setMatches([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [followedPlayerId, activeKey]);

  // Don't list the match the user is already looking at.
  const viewingMatchId = matchIdFromPath(location.pathname);
  const visibleMatches = useMemo(
    () => (viewingMatchId == null ? matches : matches.filter(m => m.id !== viewingMatchId)),
    [matches, viewingMatchId]
  );

  // Tag each card with its season only when the list mixes seasons.
  const mixesSeasons = new Set(visibleMatches.map(m => m.season_id)).size > 1;

  if (followedPlayerId == null) return null;

  return (
    <section className="followed" aria-labelledby="followed-heading">
      <div className="followed__header">
        <h2 id="followed-heading" className="followed__title">
          Your next matches
        </h2>
        {playerName && (
          <span className="followed__player">
            Following <Link to={`/player/${followedPlayerId}`}>{playerName}</Link>
          </span>
        )}
        <Link className="followed__change" to="/settings">
          Change
        </Link>
      </div>

      {loading || seasonsLoading ? (
        <p className="followed__empty">Loading…</p>
      ) : visibleMatches.length === 0 ? (
        <p className="followed__empty">
          {playerName
            ? `No upcoming matches for ${playerName} right now.`
            : 'No upcoming matches.'}
        </p>
      ) : (
        <div className="match-list">
          {visibleMatches.map(match => {
            const season = mixesSeasons ? seasonById(match.season_id) : undefined;
            return (
              <MatchCard
                key={match.id}
                match={match}
                tierAccent={match.tier_id.replace('code_', '') as 's' | 'a' | 'b'}
                seasonTag={season ? seasonLabelShort(season.title_id, season.season_index) : undefined}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
