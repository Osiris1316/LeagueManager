import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { seasonNameShort } from '@league-manager/core';
import type { QueueGroup } from '@league-manager/core';
import { getSeasonMatches } from '../api/client';
import type { MatchWithPlayers, Season } from '../api/client';
import { MatchCard } from '../components/MatchCard';
import type { CardSeason } from '../components/MatchCard';
import { GROUP_LABELS } from '../components/your-matches/format';
import { useFollow } from '../context/FollowContext';
import { useSeasonLookup, useSeasons } from '../context/SeasonsContext';
import { useYourMatches } from '../context/YourMatchesContext';
import { useStoredFlag } from '../hooks/useStoredFlag';

const TIER_LABELS: Record<string, string> = {
  code_s: 'Code S',
  code_a: 'Code A',
  code_b: 'Code B',
};

function tierAccent(tierId: string): 's' | 'a' | 'b' {
  return tierId.replace('code_', '') as 's' | 'a' | 'b';
}

/** Newest result first. */
function byCompletedDesc(a: MatchWithPlayers, b: MatchWithPlayers): number {
  if (a.completed_at && b.completed_at) return b.completed_at.localeCompare(a.completed_at);
  return (b.round_number ?? 0) - (a.round_number ?? 0);
}

/** One titled list of match cards. */
function MatchSection({ id, title, matches, seasonFor, tone }: {
  id: string;
  title: string;
  matches: MatchWithPlayers[];
  seasonFor: (m: MatchWithPlayers) => CardSeason | undefined;
  tone?: QueueGroup;
}) {
  if (matches.length === 0) return null;
  return (
    <section aria-labelledby={id} className={tone ? `ym-group ym-group--${tone}` : undefined}>
      <h2 id={id} className="matches-section__heading">
        {tone && <span className="ym-group__dot" aria-hidden="true" />}
        {title}
        <span className="matches-section__count">{matches.length}</span>
      </h2>
      <div className="match-list">
        {matches.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            tierAccent={tierAccent(match.tier_id)}
            season={seasonFor(match)}
          />
        ))}
      </div>
    </section>
  );
}

function PageHead({ title, actions }: { title: string; actions: ReactNode }) {
  return (
    <div className="page-head">
      <div className="page-head__title">
        <h1>Matches</h1>
        {title && <span className="page-head__meta">{title}</span>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </div>
  );
}

export function MatchesPage() {
  const { seasons, loading: seasonsLoading } = useSeasons();
  const seasonById = useSeasonLookup();
  const { followedPlayerId } = useFollow();
  const { followed, openPanel } = useYourMatches();

  // Following is the default once you follow someone; the last choice is
  // remembered in this browser.
  const [preferAll, setPreferAll] = useStoredFlag('ui.matches_show_all', false);
  const showingFollowing = !preferAll && followedPlayerId != null;
  const setView = (view: 'following' | 'all') => setPreferAll(view === 'all');

  // "All" covers every live league at once. With no active season, fall back
  // to the most recent one so the page is never empty between seasons.
  const leagues: Season[] = useMemo(() => {
    const active = seasons.filter(s => s.status === 'active');
    if (active.length) return active;
    return seasons.filter(s => s.status !== 'pending').slice(0, 1);
  }, [seasons]);
  const leagueKey = leagues.map(s => s.id).join(',');
  const multiLeague = leagues.length > 1;

  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    if (seasonsLoading) return;
    if (leagueKey === '') {
      setLoading(false);
      setError('No seasons found');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(leagueKey.split(',').map(id => getSeasonMatches(Number(id))))
      .then(lists => { if (!cancelled) setMatches(lists.flat()); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leagueKey, seasonsLoading]);

  const seasonFor = (m: MatchWithPlayers): CardSeason | undefined => seasonById(m.season_id);

  // Tier chips come from the matches themselves, so only real tiers show.
  const tierOptions = useMemo(() => {
    const present = [...new Set(matches.map(m => m.tier_id))].sort();
    return [{ value: 'all', label: 'All tiers' }, ...present.map(t => ({ value: t, label: TIER_LABELS[t] ?? t }))];
  }, [matches]);

  const leagueLabels = leagues.map(s => seasonNameShort(s)).join(' · ');

  const switcher = followedPlayerId != null && (
    <div className="view-switch" role="group" aria-label="Which matches">
      <button
        type="button"
        className={`view-switch__btn${showingFollowing ? ' view-switch__btn--active' : ''}`}
        onClick={() => setView('following')}
        aria-pressed={showingFollowing}
      >
        Following
      </button>
      <button
        type="button"
        className={`view-switch__btn${!showingFollowing ? ' view-switch__btn--active' : ''}`}
        onClick={() => setView('all')}
        aria-pressed={!showingFollowing}
      >
        All
      </button>
    </div>
  );

  if (showingFollowing) {
    const { queue } = followed;
    const liveIds = new Set(seasons.filter(s => s.status === 'active').map(s => s.id));
    const played = followed.matches
      .filter(m => m.status === 'complete' && liveIds.has(m.season_id))
      .sort(byCompletedDesc);
    const nothing = queue.overdue.length + queue.current.length + queue.upcoming.length + played.length === 0;

    return (
      <div>
        <PageHead title={leagueLabels} actions={switcher} />
        <p className="matches-page__following">
          Matches for{' '}
          <Link to={`/player/${followedPlayerId}`}>{followed.playerName ?? 'the player you follow'}</Link>
          {' '}in live leagues.{' '}
          <button type="button" className="ym-link-btn" onClick={openPanel}>Change player</button>
        </p>

        {followed.status === 'loading' && followed.matches.length === 0 ? (
          <div className="loading" role="status" aria-live="polite">Loading matches…</div>
        ) : followed.status === 'error' ? (
          <div role="alert"><p>Couldn't load matches. Try again in a moment.</p></div>
        ) : (
          <>
            <MatchSection id="following-overdue" title={GROUP_LABELS.overdue} matches={queue.overdue} seasonFor={seasonFor} tone="overdue" />
            <MatchSection id="following-current" title={GROUP_LABELS.current} matches={queue.current} seasonFor={seasonFor} tone="current" />
            <MatchSection id="following-upcoming" title={GROUP_LABELS.upcoming} matches={queue.upcoming} seasonFor={seasonFor} tone="upcoming" />
            <MatchSection id="following-played" title="Played" matches={played} seasonFor={seasonFor} />
            {nothing && <p className="matches-page__empty">No matches in live leagues.</p>}
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return <div className="loading" role="status" aria-live="polite">Loading matches…</div>;
  }

  if (error) {
    return <div role="alert"><p>{error}</p></div>;
  }

  const filtered = tierFilter === 'all'
    ? matches
    : matches.filter(m => m.tier_id === tierFilter);

  const upcoming = filtered
    .filter(m => m.status !== 'complete')
    .sort((a, b) => {
      if (a.scheduled_at && b.scheduled_at) return a.scheduled_at.localeCompare(b.scheduled_at);
      if (a.scheduled_at) return -1;
      if (b.scheduled_at) return 1;
      return (a.round_number ?? 99) - (b.round_number ?? 99);
    });

  const completed = filtered.filter(m => m.status === 'complete').sort(byCompletedDesc);

  // The end cap only helps when the list mixes leagues.
  const allSeasonFor = multiLeague ? seasonFor : () => undefined;

  return (
    <div>
      <PageHead title={leagueLabels} actions={switcher} />

      <div className="matches-page__filters">
        {tierOptions.map(opt => (
          <button
            key={opt.value}
            className={`filter-chip${tierFilter === opt.value ? ' filter-chip--active' : ''}`}
            onClick={() => setTierFilter(opt.value)}
            aria-pressed={tierFilter === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <MatchSection id="upcoming-heading" title="Upcoming" matches={upcoming} seasonFor={allSeasonFor} />
      <MatchSection id="completed-heading" title="Completed" matches={completed} seasonFor={allSeasonFor} />

      {upcoming.length === 0 && completed.length === 0 && (
        <p className="matches-page__empty">No matches found.</p>
      )}
    </div>
  );
}
