import { useNavigate } from 'react-router-dom';
import { seasonLabelShort } from '@league-manager/core';
import { useAdmin } from '../context/AdminContext';
import { useCurrentSeasonId, useSeasons } from '../context/SeasonsContext';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  complete: 'Complete',
  pending: 'Upcoming',
};

export function SeasonPicker() {
  const { seasons, loading } = useSeasons();
  const { isAdmin } = useAdmin();
  const selected = useCurrentSeasonId();
  const navigate = useNavigate();

  // Seasons are staged as 'pending' so they stay out of sight until they go
  // live, so only an admin sees them here. The season being viewed is always
  // listed, so the control never shows a different season than the page.
  const visible = seasons.filter(
    s => s.status !== 'pending' || isAdmin || s.id === selected
  );

  // Always show the control once we know there is at least one season, so the
  // season being viewed is always visible, even before a second one exists.
  if (loading || visible.length === 0) return null;

  return (
    <div className="season-picker">
      <label className="sr-only" htmlFor="season-picker-select">
        {visible.length > 1 ? 'View season' : 'Current season'}
      </label>
      <select
        id="season-picker-select"
        className="season-picker__select"
        value={selected ?? ''}
        onChange={e => {
          const id = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(id)) navigate(`/season/${id}`);
        }}
      >
        {visible.map(s => (
          <option key={s.id} value={s.id}>
            {`${seasonLabelShort(s.title_id, s.season_index)} · ${STATUS_LABELS[s.status] ?? s.status}`}
          </option>
        ))}
      </select>
    </div>
  );
}
