import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPlayer } from '../api/client';
import type { PlayerDetailResponse } from '../api/client';
import { seasonLabelShort } from '@league-manager/core';
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
        <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-md)' }}>
          <Link to="/players" style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            ← All Players
          </Link>
        </nav>

        <header className="player-header">
          <div className="player-header__title">
            <h1>{player.display_name}</h1>
            <button
              type="button"
              className={`follow-btn${isFollowed ? ' follow-btn--on' : ''}`}
              onClick={() => (isFollowed ? unfollow() : follow(player.id))}
              aria-pressed={isFollowed}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </button>
          </div>
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

        {/* Phones: this player's upcoming matches as tiles, above the stats. */}
        {!isDesktop && <PlayerRibbon data={upcoming} />}

        <section aria-labelledby="player-stats-heading" style={{ marginBottom: 'var(--space-xl)' }}>
          <h2 id="player-stats-heading" style={{ marginBottom: 'var(--space-md)' }}>
            Player Stats
          </h2>

          <PlayerStatsSection playerId={player.id} />
        </section>

        <section aria-labelledby="match-history-heading">
          <h2 id="match-history-heading" style={{ marginBottom: 'var(--space-md)' }}>
            Match History
          </h2>

          {matches.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>No matches yet.</p>
          ) : (
            <div className="match-list">
              {matches.map(match => {
                const season = seasonById(match.season_id);
                return (
                  <MatchCard
                    key={match.id}
                    match={match}
                    tierAccent={tierId as 's' | 'a' | 'b'}
                    seasonTag={season ? seasonLabelShort(season.title_id, season.season_index) : undefined}
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