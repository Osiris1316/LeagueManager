import { Link } from 'react-router-dom';
import type { MatchWithPlayers } from '../api/client';

interface MatchCardProps {
  match: MatchWithPlayers;
  tierAccent?: 's' | 'a' | 'b';
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function MatchCard({ match, tierAccent }: MatchCardProps) {
  const tierClass = tierAccent ? ` match-card--tier-${tierAccent}` : '';
  return <SymmetricCard match={match} tierClass={tierClass} />;
}

function SymmetricCard({ match, tierClass }: { match: MatchWithPlayers; tierClass: string }) {
  const isComplete = match.status === 'complete';
  const inProgress = match.status === 'in_progress';
  const p1Won = match.winner_id === match.player1_id;
  const p2Won = match.winner_id === match.player2_id;

  const statusLabel = isComplete
    ? `${match.winner_name} wins ${match.player1_score}–${match.player2_score}`
    : inProgress
      ? 'In progress'
      : match.scheduled_at
        ? `Scheduled ${formatScheduledTime(match.scheduled_at)}`
        : 'Not yet scheduled';

  return (
    <div className={`match-card match-card--grid${tierClass}`}>
      <span className={`match-card__cell-score match-card__cell--top${p1Won ? ' match-card__cell-score--winner' : ''}`}>
        {isComplete ? match.player1_score : '–'}
      </span>
      <span className={`match-card__name match-card__cell--top${p1Won ? ' match-card__name--winner' : ''}`}>
        <Link to={`/player/${match.player1_id}`} className="match-card__player-link">
          {match.player1_name}
        </Link>
      </span>

      <span className={`match-card__cell-score${p2Won ? ' match-card__cell-score--winner' : ''}`}>
        {isComplete ? match.player2_score : '–'}
      </span>
      <span className={`match-card__name${p2Won ? ' match-card__name--winner' : ''}`}>
        <Link to={`/player/${match.player2_id}`} className="match-card__player-link">
          {match.player2_name}
        </Link>
      </span>

      <span className="match-card__status">
        {isComplete ? (
          <span className="sr-only">{statusLabel}</span>
        ) : inProgress ? (
          <span className="badge badge--pending">Live</span>
        ) : match.scheduled_at ? (
          <span className="badge badge--pending">{formatScheduledTime(match.scheduled_at)}</span>
        ) : null}
      </span>

      <Link
        to={`/match/${match.id}`}
        className="match-card__info"
        aria-label={`View match: ${match.player1_name} vs ${match.player2_name}`}
      >
        <svg
          viewBox="0 0 24 24" width="18" height="18"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </Link>
    </div>
  );
}