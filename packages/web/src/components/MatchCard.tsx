import { Link } from 'react-router-dom';
import type { MatchWithPlayers } from '../api/client';

interface MatchCardProps {
  match: MatchWithPlayers;
  perspectivePlayerId?: number;
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

function PlayerLink({ to, children, className }: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className="match-card__player-link"
      onClick={e => e.stopPropagation()}
    >
      <span className={className}>{children}</span>
    </Link>
  );
}

export function MatchCard({ match, perspectivePlayerId, tierAccent }: MatchCardProps) {
  const isComplete = match.status === 'complete';
  const tierClass = tierAccent ? ` match-card--tier-${tierAccent}` : '';

  // Perspective mode: showing from one player's point of view
  if (perspectivePlayerId != null) {
    return <PerspectiveCard match={match} playerId={perspectivePlayerId} tierClass={tierClass} />;
  }

  // Symmetric mode: neutral view of both players
  return <SymmetricCard match={match} tierClass={tierClass} />;
}

function SymmetricCard({ match, tierClass }: { match: MatchWithPlayers; tierClass: string }) {
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
      className={`match-card${tierClass}`}
      aria-label={`${match.player1_name} vs ${match.player2_name}: ${statusLabel}`}
    >
      <span className="match-card__meta">R{match.round_number}</span>

      <PlayerLink
        to={`/player/${match.player1_id}`}
        className={`match-card__player match-card__player--right${p1Won ? ' match-card__player--winner' : ''}`}
      >
        {match.player1_name}
      </PlayerLink>

      {isComplete ? (
        <span className="match-card__score">
          {match.player1_score}
          <span className="match-card__score-sep">–</span>
          {match.player2_score}
        </span>
      ) : (
        <span className="match-card__vs">vs</span>
      )}

      <PlayerLink
        to={`/player/${match.player2_id}`}
        className={`match-card__player${p2Won ? ' match-card__player--winner' : ''}`}
      >
        {match.player2_name}
      </PlayerLink>

      <span className="match-card__trailing">
        {isComplete ? (
          <span className="sr-only">{statusLabel}</span>
        ) : (
          <span className="badge badge--pending">
            {match.status === 'in_progress'
              ? 'Live'
              : match.scheduled_at
                ? formatScheduledTime(match.scheduled_at)
                : 'Pending'}
          </span>
        )}
      </span>
    </Link>
  );
}

function PerspectiveCard({ match, playerId, tierClass }: {
  match: MatchWithPlayers;
  playerId: number;
  tierClass: string;
}) {
  const isP1 = match.player1_id === playerId;
  const opponentName = isP1 ? match.player2_name : match.player1_name;
  const opponentId = isP1 ? match.player2_id : match.player1_id;
  const playerScore = isP1 ? match.player1_score : match.player2_score;
  const opponentScore = isP1 ? match.player2_score : match.player1_score;
  const won = match.winner_id === playerId;
  const isComplete = match.status === 'complete';

  const statusLabel = isComplete
    ? `${won ? 'Won' : 'Lost'} ${playerScore}–${opponentScore} vs ${opponentName}`
    : `Upcoming vs ${opponentName}`;

  return (
    <Link
      to={`/match/${match.id}`}
      className={`match-card${tierClass}`}
      aria-label={statusLabel}
    >
      <span className="match-card__meta">R{match.round_number}</span>

      <span className="match-card__vs">vs</span>

      <PlayerLink
        to={`/player/${opponentId}`}
        className="match-card__player"
      >
        {opponentName}
      </PlayerLink>

      <span className="match-card__trailing">
        {isComplete ? (
          <>
            <span className={`match-card__score ${won ? 'match-card__score--win' : 'match-card__score--loss'}`}>
              {playerScore}
              <span className="match-card__score-sep">–</span>
              {opponentScore}
            </span>
            <span className={`badge ${won ? 'badge--win' : 'badge--loss'}`}>
              {won ? 'W' : 'L'}
            </span>
          </>
        ) : (
          <span className="badge badge--pending">
            {match.scheduled_at ? formatScheduledTime(match.scheduled_at) : 'Pending'}
          </span>
        )}
      </span>
    </Link>
  );
}