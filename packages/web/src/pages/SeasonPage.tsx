import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getStandings } from '../api/client';
import type { StandingsResponse } from '../api/client';
import { useSeasons } from '../context/SeasonsContext';
import { StandingsTable } from '../components/StandingsTable';
import { ScheduleView } from '../components/ScheduleView';

export function SeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const { defaultSeasonId, loading: seasonsLoading } = useSeasons();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsed = seasonId ? Number.parseInt(seasonId, 10) : Number.NaN;
  // No season in the URL means "show me the current one".
  const targetId = Number.isFinite(parsed) ? parsed : defaultSeasonId;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (targetId == null) {
        // Still waiting on the season list.
        if (!seasonsLoading) {
          setError('No seasons found.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);
      setData(null);

      try {
        const standings = await getStandings(targetId);
        if (!cancelled) setData(standings);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load standings');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [targetId, seasonsLoading]);

  if (loading) {
    return (
      <div className="loading" role="status" aria-live="polite">
        Loading standings…
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { season, tiers } = data;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1>Season {season.season_number}</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          Best of {season.best_of}
          {season.status === 'active' && <span className="badge badge--active">In Progress</span>}
          {season.status === 'complete' && <span className="badge badge--archived">Archived</span>}
          {season.status === 'pending' && <span className="badge badge--pending">Upcoming</span>}
        </p>
      </header>

      {tiers.map(tierData => {
        const tierId = tierData.tier.id.replace('code_', '');
        return (
          <section
            key={tierData.tier.id}
            className="tier-section"
            aria-labelledby={`tier-heading-${tierData.tier.id}`}
          >
            <div className={`tier-bar tier-bar--${tierId}`} aria-hidden="true" />

            <div className="section-header">
              <h2 id={`tier-heading-${tierData.tier.id}`}>
                {tierData.tier.display_name}
              </h2>
              <span className={`badge badge--${tierId}`}>
                {tierData.tier.civ_rule === 'pro_draft'
                  ? 'Civ Draft'
                  : tierData.tier.civ_rule === 'win_lock'
                  ? 'Win Lock'
                  : 'Open'}
              </span>
            </div>

            {tierData.tier.rules_summary && (
              <p style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-tertiary)',
                marginBottom: 'var(--space-lg)',
                maxWidth: '40rem',
              }}>
                {tierData.tier.rules_summary}
              </p>
            )}

            <StandingsTable
              standings={tierData.standings}
              tierId={tierData.tier.id}
            />

            <div style={{ marginTop: 'var(--space-lg)' }}>
              <h3 style={{ marginBottom: 'var(--space-md)' }}>Schedule</h3>
              <ScheduleView
                matches={tierData.matches}
                rounds={tierData.rounds}
                seasonStartDate={season.started_at}
                tierAccent={tierData.tier.id.replace('code_', '') as 's' | 'a' | 'b'}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
