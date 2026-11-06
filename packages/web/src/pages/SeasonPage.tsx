import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { getStandings } from '../api/client';
import type { StandingsResponse } from '../api/client';
import { useSeasons } from '../context/SeasonsContext';
import { useStoredFlag } from '../hooks/useStoredFlag';
import { StackedView } from '../views/StackedView';
import { ColumnsView } from '../views/ColumnsView';
import { seasonLabel } from '@league-manager/core';

export function SeasonPage() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const { defaultSeasonId, loading: seasonsLoading } = useSeasons();
  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Columns or Stacked, remembered in this browser.
  const [stacked, setStacked] = useStoredFlag('ui.standings_stacked', false);
  const viewMode: 'stacked' | 'columns' = stacked ? 'stacked' : 'columns';
  const setViewMode = (mode: 'stacked' | 'columns') => setStacked(mode === 'stacked');
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
      <div className="page-head">
        <div className="page-head__title">
          <h1>{seasonLabel(season.title_id, season.season_index)}</h1>
          <span className="page-head__meta">
            Best of {season.best_of}
            {season.status === 'active' && <span className="badge badge--active">In progress</span>}
            {season.status === 'complete' && <span className="badge badge--archived">Archived</span>}
            {season.status === 'pending' && <span className="badge badge--pending">Upcoming</span>}
          </span>
        </div>
        <div className="page-head__actions">
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
        </div>
      </div>

      {viewMode === 'stacked'
        ? <StackedView data={data} />
        : <ColumnsView data={data} />}
    </div>
  );
}
