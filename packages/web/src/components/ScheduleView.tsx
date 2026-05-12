import { Link } from 'react-router-dom';
import type { MatchWithPlayers } from '../api/client';

interface ScheduleViewProps {
  matches: MatchWithPlayers[];
  rounds: Record<string, MatchWithPlayers[]>;
  seasonStartDate?: string | null;
}

function formatDate(date: Date): string {
  const month = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}.${m}.${d}`;
}

function getRoundDateRange(
  roundNumber: number,
  seasonStart: string | null | undefined
): string | null {
  if (!seasonStart) return null;

  const start = new Date(seasonStart + 'T00:00:00');
  if (isNaN(start.getTime())) return null;

  const roundStart = new Date(start);
  roundStart.setDate(roundStart.getDate() + (roundNumber - 1) * 7);

  const roundEnd = new Date(roundStart);
  roundEnd.setDate(roundEnd.getDate() + 6);

  return `${formatDate(roundStart)} – ${formatDate(roundEnd)}`;
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function ScheduleView({ matches, rounds, seasonStartDate }: ScheduleViewProps) {
  if (matches.length === 0) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>No matches scheduled.</p>;
  }

  const roundNumbers = Object.keys(rounds)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div role="list" aria-label="Match schedule by round">
      {roundNumbers.map(rn => {
        const roundMatches = rounds[String(rn)] ?? [];
        const dateRange = getRoundDateRange(rn, seasonStartDate);

        return (
          <div key={rn} role="listitem">
            <div className="round-header">
              Round {rn}
              {dateRange && (
                <span style={{
                  fontWeight: 400,
                  marginLeft: '0.5rem',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.75rem',
                  letterSpacing: '0.02em',
                }}>
                  {dateRange}
                </span>
              )}
            </div>
            <div className="match-list">
              {roundMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchCard({ match }: { match: MatchWithPlayers }) {
  const isComplete = match.status === 'complete';
  const p1Won = match.winner_id === match.player1_id;
  const p2Won = match.winner_id === match.player2_id;

  const statusLabel = isComplete
    ? `${match.winner_name} wins ${match.player1_score}–${match.player2_score}`
    : match.status === 'in_progress'
    ? 'In progress'
    : 'Upcoming';

  return (
    <Link
      to={`/match/${match.id}`}
      className="match-card"
      aria-label={`${match.player1_name} vs ${match.player2_name}: ${statusLabel}`}
    >
      <span
        className={`match-card__player ${p1Won ? 'match-card__player--winner' : ''}`}
        style={{ textAlign: 'right' }}
      >
        {match.player1_name}
      </span>

      {isComplete ? (
        <span className="match-card__score">
          {match.player1_score}
          <span style={{ margin: '0 0.25rem', color: 'var(--color-text-tertiary)' }}>–</span>
          {match.player2_score}
        </span>
      ) : (
        <span className="match-card__vs">vs</span>
      )}

      <span
        className={`match-card__player ${p2Won ? 'match-card__player--winner' : ''}`}
      >
        {match.player2_name}
      </span>

      {isComplete && (
        <span className="sr-only">{statusLabel}</span>
      )}
      {!isComplete && (
        <span className="badge badge--pending" style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {match.status === 'in_progress' ? 'Live' : match.scheduled_at ? formatScheduledTime(match.scheduled_at) : 'Pending'}
        </span>
      )}
    </Link>
  );
}