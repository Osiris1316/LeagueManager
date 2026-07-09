import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSeasons, getStandings } from '../api/client';
import type { StandingsResponse, Season } from '../api/client';
import { StackedView } from '../views/StackedView';

export function SeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // If no seasonId in URL, find the most recent active season
        let targetId: number;

        if (seasonId) {
          targetId = parseInt(seasonId, 10);
        } else {
          const allSeasons = await getSeasons();
          if (cancelled) return;
          setSeasons(allSeasons);

          const active = allSeasons.find(s => s.status === 'active');
          const latest = allSeasons[0]; // sorted desc by season_number
          const target = active ?? latest;

          if (!target) {
            setError('No seasons found.');
            setLoading(false);
            return;
          }
          targetId = target.id;
        }

        const standings = await getStandings(targetId);
        if (!cancelled) {
          setData(standings);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load standings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [seasonId]);

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

  const { season } = data;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1>Season {season.season_number}</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          Best of {season.best_of}
          {season.status === 'active' && ' · In Progress'}
          {season.status === 'complete' && ' · Complete'}
        </p>
      </header>

      <StackedView data={data} />
    </div>
  );
}
