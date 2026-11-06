import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPlayer } from '../api/client';
import type { MatchWithPlayers } from '../api/client';
import { useFollow } from '../context/FollowContext';
import { useCurrentSeasonId } from '../context/SeasonsContext';
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
  const seasonId = useCurrentSeasonId();
  const location = useLocation();

  const [playerName, setPlayerName] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (followedPlayerId == null || seasonId == null) {
      setPlayerName(null);
      setMatches([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getPlayer(followedPlayerId)
      .then(detail => {
        if (cancelled) return;
        setPlayerName(detail.player.display_name);
        setMatches(
          upcoming(detail.matches.filter(m => m.season_id === seasonId))
        );
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
  }, [followedPlayerId, seasonId]);

  // Don't list the match the user is already looking at.
  const viewingMatchId = matchIdFromPath(location.pathname);
  const visibleMatches = useMemo(
    () => (viewingMatchId == null ? matches : matches.filter(m => m.id !== viewingMatchId)),
    [matches, viewingMatchId]
  );

  const accent = useMemo(() => {
    if (!visibleMatches.length) return undefined;
    return visibleMatches[0]!.tier_id.replace('code_', '') as 's' | 'a' | 'b';
  }, [visibleMatches]);

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

      {loading ? (
        <p className="followed__empty">Loading…</p>
      ) : visibleMatches.length === 0 ? (
        <p className="followed__empty">
          {playerName
            ? `No upcoming matches for ${playerName} in this season.`
            : 'No upcoming matches.'}
        </p>
      ) : (
        <div className="match-list">
          {visibleMatches.map(match => (
            <MatchCard key={match.id} match={match} tierAccent={accent} />
          ))}
        </div>
      )}
    </section>
  );
}
