import { useEffect, useMemo, useState } from 'react';
import {
  filterSlotsByScope,
  computeCivStats,
  computeMapStats,
  type SlotView,
  type StatsScope,
} from '@league-manager/core';
import { getPlayerSlots, type SeasonMeta } from '../api/client';
import { PlayerStatsTables } from './PlayerStatsTables';

interface PlayerStatsSectionProps {
  playerId: number;
}

function datePart(raw: string | null): string | null {
  if (!raw) return null;
  return raw.slice(0, 10); // tolerates "2026-05-14" and "2026-06-12 18:25:04"
}

function formatDate(raw: string | null): string {
  const iso = datePart(raw);
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function seasonLabel(season: SeasonMeta): string {
  const start = formatDate(season.startedAt);
  const end = season.completedAt ? formatDate(season.completedAt) : 'present';
  return `Season ${season.seasonNumber} · ${start} – ${end}`;
}

export function PlayerStatsSection({ playerId }: PlayerStatsSectionProps) {
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [seasons, setSeasons] = useState<SeasonMeta[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState<StatsScope>('all');
  const [seasonId, setSeasonId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSlots(null);
    setError(null);

    getPlayerSlots(playerId)
      .then((res) => {
        if (cancelled) return;
        setSlots(res.slots);
        setSeasons(res.seasons);
        // default the season dropdown to the most recent season
        const latest = res.seasons.at(-1);
        setSeasonId(latest ? latest.id : null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load stats');
      });

    return () => {
      cancelled = true;
    };
  }, [playerId]);

  const orderedSeasonIds = useMemo(() => seasons.map((s) => s.id), [seasons]);

  const stats = useMemo(() => {
    if (!slots) return null;
    const scoped = filterSlotsByScope(slots, { scope, seasonId }, orderedSeasonIds);
    return {
      playerId,
      civs: computeCivStats(scoped, playerId),
      maps: computeMapStats(scoped, playerId),
    };
  }, [slots, scope, seasonId, orderedSeasonIds, playerId]);

  if (error) {
    return <p className="player-stats-section__note" role="alert">Stats unavailable right now.</p>;
  }

  if (!slots || !stats) {
    return <p className="player-stats-section__note">Loading stats…</p>;
  }

  const seasonSelectDisabled = scope === 'all' || seasons.length === 0;

  return (
    <div className="player-stats-section">
      <div className="stats-scope-picker">
        <label className="sr-only" htmlFor="stats-scope">Scope</label>
        <select
          id="stats-scope"
          className="stats-scope-picker__select"
          value={scope}
          onChange={(e) => setScope(e.target.value as StatsScope)}
        >
          <option value="all">All time</option>
          <option value="during">During</option>
          <option value="since">Since</option>
        </select>

        <label className="sr-only" htmlFor="stats-season">Season</label>
        <select
          id="stats-season"
          className="stats-scope-picker__select"
          value={seasonId ?? ''}
          disabled={seasonSelectDisabled}
          onChange={(e) => setSeasonId(e.target.value ? Number(e.target.value) : null)}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>{seasonLabel(s)}</option>
          ))}
        </select>
      </div>

      <PlayerStatsTables stats={stats} />
    </div>
  );
}