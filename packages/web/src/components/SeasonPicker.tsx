import { useNavigate } from 'react-router-dom';
import { useCurrentSeasonId, useSeasons } from '../context/SeasonsContext';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  complete: 'Complete',
  pending: 'Upcoming',
};

export function SeasonPicker() {
  const { seasons, loading } = useSeasons();
  const selected = useCurrentSeasonId();
  const navigate = useNavigate();

  // Always show the control once we know there is at least one season, so the
  // season being viewed is always visible — even before a second one exists.
  if (loading || seasons.length === 0) return null;

  return (
    <div className="season-picker">
      <label className="sr-only" htmlFor="season-picker-select">
        {seasons.length > 1 ? 'View season' : 'Current season'}
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
        {seasons.map(s => (
          <option key={s.id} value={s.id}>
            {`Season ${s.season_number} · ${STATUS_LABELS[s.status] ?? s.status}`}
          </option>
        ))}
      </select>
    </div>
  );
}
