import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getStandings } from '../api/client';
import type { StandingsResponse } from '../api/client';
import { useSeasons } from '../context/SeasonsContext';
import { StackedView } from '../views/StackedView';
import { ColumnsView } from '../views/ColumnsView';
import { seasonLabel } from '@league-manager/core';

export function SeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const { defaultSeasonId, loading: seasonsLoading } = useSeasons();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'stacked' | 'columns'>('columns');
  const { hash } = useLocation();

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

  // A link like /season/5#standing-2 (from "your matches") scrolls to that
  // player's row once the standings have loaded, and briefly highlights it.
  useEffect(() => {
    if (!data || !hash.startsWith('#standing-')) return;
    const row = document.getElementById(hash.slice(1));
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('standings-row--flash');
    const timer = window.setTimeout(() => row.classList.remove('standings-row--flash'), 2000);
    return () => window.clearTimeout(timer);
  }, [data, hash, viewMode]);

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
        <h1>{seasonLabel(season.title_id, season.season_index)}</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          Best of {season.best_of}
          {season.status === 'active' && <span className="badge badge--active">In Progress</span>}
          {season.status === 'complete' && <span className="badge badge--archived">Archived</span>}
          {season.status === 'pending' && <span className="badge badge--pending">Upcoming</span>}
        </p>
      </header>

      <div className="view-switch" role="group" aria-label="Layout view">
        <button
          type="button"
          className={`view-switch__btn${viewMode === 'columns' ? ' view-switch__btn--active' : ''}`}
          onClick={() => setViewMode('columns')}
          aria-pressed={viewMode === 'columns'}
        >
          Columns
        </button>
        <button
          type="button"
          className={`view-switch__btn${viewMode === 'stacked' ? ' view-switch__btn--active' : ''}`}
          onClick={() => setViewMode('stacked')}
          aria-pressed={viewMode === 'stacked'}
        >
          Stacked
        </button>
      </div>

      {viewMode === 'stacked'
        ? <StackedView data={data} />
        : <ColumnsView data={data} />}
    </div>
  );
}
