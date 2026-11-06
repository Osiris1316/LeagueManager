import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { seasonLabel, seasonLabelShort } from '@league-manager/core';
import { getStandings } from '../api/client';
import type { StandingsResponse } from '../api/client';
import { useAdmin } from '../context/AdminContext';
import { useCurrentSeasonId, useSeasons } from '../context/SeasonsContext';
import { MatchCard } from '../components/MatchCard';

type Filter = 'needs' | 'complete' | 'all';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  complete: 'Complete',
  pending: 'Pending',
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'needs', label: 'Needs results' },
  { id: 'complete', label: 'Completed' },
  { id: 'all', label: 'All' },
];

export function AdminPage() {
  const { isAdmin } = useAdmin();
  const { seasons } = useSeasons();
  const currentSeasonId = useCurrentSeasonId();
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();

  const parsed = seasonId ? Number.parseInt(seasonId, 10) : Number.NaN;
  const targetId = Number.isFinite(parsed) ? parsed : currentSeasonId;

  const [data, setData] = useState<StandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('needs');

  useEffect(() => {
    if (targetId == null) return;
    const seasonIdToLoad = targetId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const standings = await getStandings(seasonIdToLoad);
        if (!cancelled) setData(standings);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load matches');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [targetId]);

  // Counts across every tier, so the filter tabs stay honest.
  const counts = useMemo(() => {
    const all = data?.tiers.flatMap(t => t.matches) ?? [];
    return {
      needs: all.filter(m => m.status !== 'complete').length,
      complete: all.filter(m => m.status === 'complete').length,
      all: all.length,
    };
  }, [data]);

  const visibleTiers = useMemo(() => {
    if (!data) return [];
    return data.tiers
      .map(tier => ({
        tier: tier.tier,
        matches: tier.matches.filter(m => {
          if (filter === 'needs') return m.status !== 'complete';
          if (filter === 'complete') return m.status === 'complete';
          return true;
        }),
      }))
      .filter(t => t.matches.length > 0);
  }, [data, filter]);

  if (!isAdmin) {
    return (
      <div role="alert">
        <h1>Admin</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Admin access is required. Open the ☰ menu and log in with your admin token.
        </p>
      </div>
    );
  }

  const season = data?.season;

  return (
    <div>
      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <h1>Admin</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          Report, correct, and schedule match results.
        </p>
      </header>

      <div className="admin-toolbar">
        <label className="admin-toolbar__label" htmlFor="admin-season-select">
          Season
        </label>
        <select
          id="admin-season-select"
          className="season-picker__select"
          value={targetId ?? ''}
          onChange={e => {
            const id = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(id)) navigate(`/admin/${id}`);
          }}
        >
          {seasons.map(s => (
            <option key={s.id} value={s.id}>
              {`${seasonLabelShort(s.title_id, s.season_index)} · ${STATUS_LABELS[s.status] ?? s.status}`}
            </option>
          ))}
        </select>

        <div className="admin-filters" role="tablist" aria-label="Filter matches">
          {FILTERS.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`admin-filter${filter === f.id ? ' admin-filter--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="admin-filter__count">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="loading" role="status" aria-live="polite">Loading matches…</div>}

      {error && (
        <div role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && season && (
        <>
          {visibleTiers.length === 0 ? (
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {filter === 'needs'
                ? `Every match in ${seasonLabel(season.title_id, season.season_index)} has a result.`
                : 'No matches match this filter.'}
            </p>
          ) : (
            visibleTiers.map(({ tier, matches }) => {
              const accent = tier.id.replace('code_', '') as 's' | 'a' | 'b';
              return (
                <section key={tier.id} className="tier-section" aria-labelledby={`admin-tier-${tier.id}`}>
                  <div className="section-header">
                    <h2 id={`admin-tier-${tier.id}`}>{tier.display_name}</h2>
                    <span className={`badge badge--${accent}`}>
                      {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                    </span>
                  </div>
                  <div className="match-list">
                    {matches.map(match => (
                      <MatchCard key={match.id} match={match} tierAccent={accent} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
