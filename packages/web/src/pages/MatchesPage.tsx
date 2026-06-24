import { useEffect, useState } from 'react';
import { getSeasons, getSeasonMatches } from '../api/client';
import type { Season, MatchWithPlayers } from '../api/client';
import { MatchCard } from '../components/MatchCard';

const TIER_OPTIONS = [
  { value: 'all', label: 'All Tiers' },
  { value: 'code_s', label: 'Code S' },
  { value: 'code_a', label: 'Code A' },
  { value: 'code_b', label: 'Code B' },
];

function tierAccent(tierId: string): 's' | 'a' | 'b' {
  return tierId.replace('code_', '') as 's' | 'a' | 'b';
}

export function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [season, setSeason] = useState<Season | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const seasons = await getSeasons();
        const current = seasons.find(s => s.status === 'active') ?? seasons[0];
        if (!current) throw new Error('No seasons found');

        const allMatches = await getSeasonMatches(current.id);
        if (!cancelled) {
          setSeason(current);
          setMatches(allMatches);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

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

  const completed = filtered
    .filter(m => m.status === 'complete')
    .sort((a, b) => {
      if (a.completed_at && b.completed_at) return b.completed_at.localeCompare(a.completed_at);
      return (b.round_number ?? 0) - (a.round_number ?? 0);
    });

  return (
    <div>
      <header className="matches-page__header">
        <h1>Matches</h1>
        {season && (
          <span className="matches-page__season">Season {season.season_number}</span>
        )}
      </header>

      <div className="matches-page__filters">
        {TIER_OPTIONS.map(opt => (
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

      {upcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <h2 id="upcoming-heading" className="matches-section__heading">
            Upcoming
            <span className="matches-section__count">{upcoming.length}</span>
          </h2>
          <div className="match-list">
            {upcoming.map(match => (
              <MatchCard key={match.id} match={match} tierAccent={tierAccent(match.tier_id)} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section aria-labelledby="completed-heading">
          <h2 id="completed-heading" className="matches-section__heading">
            Completed
            <span className="matches-section__count">{completed.length}</span>
          </h2>
          <div className="match-list">
            {completed.map(match => (
              <MatchCard key={match.id} match={match} tierAccent={tierAccent(match.tier_id)} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length === 0 && completed.length === 0 && (
        <p className="matches-page__empty">No matches found.</p>
      )}
    </div>
  );
}