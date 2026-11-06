import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlayer } from '../api/client';
import type { PlayerDetailResponse } from '../api/client';
import { MatchCard } from '../components/MatchCard';
import { PlayerStatsSection } from '../components/PlayerStatsSection';
import { PlayerRibbon } from '../components/your-matches/MatchRibbon';
import { QueueList } from '../components/your-matches/QueueList';
import { useSeasonLookup } from '../context/SeasonsContext';
import { useFollow } from '../context/FollowContext';
import { usePlayerQueue } from '../hooks/usePlayerQueue';
import { useIsDesktop } from '../hooks/useMediaQuery';

export function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const seasonById = useSeasonLookup();
  const [data, setData] = useState<PlayerDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { followedPlayerId, follow, unfollow } = useFollow();
  const isDesktop = useIsDesktop();

  const parsedId = Number.parseInt(playerId ?? '', 10);
  // Reuses the player data this page already loads, so no second request.
  const upcoming = usePlayerQueue(Number.isFinite(parsedId) ? parsedId : null, data);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const id = parseInt(playerId ?? '', 10);
        if (isNaN(id)) throw new Error('Invalid player ID');
        const playerResult = await getPlayer(id);

        if (!cancelled) {
          setData(playerResult);
        }
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

  let wins = 0;
  let losses = 0;
  for (const m of matches) {
    if (m.status !== 'complete') continue;
    if (m.winner_id === player.id) wins++;
    else losses++;
  }

  const isFollowed = followedPlayerId === player.id;

  return (
    <div className="player-layout">
      <div className="player-layout__main">
        <div className="page-head">
          <div className="page-head__title">
            <nav aria-label="Breadcrumb" className="page-head__crumbs">
              <Link to="/players">Players</Link>
              <span aria-hidden="true">/</span>
            </nav>
            <h1>{player.display_name}</h1>
            {tierAssignment && (
              <span className={`badge badge--${tierId}`}>{tierAssignment.tier_name}</span>
            )}
            <span className="page-head__meta">{wins}W – {losses}L</span>
          </div>
          <div className="page-head__actions">
            <button
              type="button"
              className={`follow-btn${isFollowed ? ' follow-btn--on' : ''}`}
              onClick={() => (isFollowed ? unfollow() : follow(player.id))}
              aria-pressed={isFollowed}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>

        {/* Phones: this player's upcoming matches as tiles, above the stats. */}
        {!isDesktop && <PlayerRibbon data={upcoming} />}

        <section aria-labelledby="player-stats-heading" className="page-section page-section--stats">
          <h2 id="player-stats-heading" className="section-title">Player stats</h2>

          <PlayerStatsSection playerId={player.id} />
        </section>

        <section aria-labelledby="match-history-heading" className="page-section">
          <h2 id="match-history-heading" className="section-title">Match history</h2>

          {matches.length === 0 ? (
            <p className="ym-note">No matches yet.</p>
          ) : (
            <div className="match-list">
              {matches.map(match => {
                const season = seasonById(match.season_id);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tierAccent={tierId as 's' | 'a' | 'b'}
                    season={season}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Desktop: this player's upcoming matches stay beside the stats. */}
      {isDesktop && (
        <aside className="ym-panel ym-panel--player" aria-labelledby="player-upcoming-title">
          <div className="ym-header">
            <div className="ym-header__text">
              <h2 id="player-upcoming-title" className="ym-header__title">Upcoming matches</h2>
            </div>
          </div>
          <div className="ym-panel__body">
            <QueueList data={upcoming} />
          </div>
        </aside>
      )}
    </div>
  );
}