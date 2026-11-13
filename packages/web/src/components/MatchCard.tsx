import { Link } from 'react-router-dom';
import { bracketSlotById, isEventSeason, seasonName, titleById } from '@league-manager/core';
import type { MatchWithPlayers } from '../api/client';
import { TitleIcon } from './TitleIcon';

/** The season fields the end cap needs. */
export interface CardSeason {
  title_id: string;
  season_index: number;
  format?: string | null;
  name?: string | null;
}

/**
 * Where a match sits within its season: "R2" / "Round 2", or for an event's
 * bracket the slot ("UB SF1" / "Upper semifinal 1").
 */
export function matchPlace(match: { round_number: number | null; bracket_slot?: string | null }): { short: string | null; full: string | null } {
  const slot = bracketSlotById(match.bracket_slot);
  if (slot) return { short: slot.shortLabel, full: slot.label };
  if (match.round_number != null) return { short: `R${match.round_number}`, full: `Round ${match.round_number}` };
  return { short: null, full: null };
}

interface MatchCardProps {
  match: MatchWithPlayers;
  tierAccent?: 's' | 'a' | 'b';
  /**
   * The match's season. When given, the card ends in a small cap with the
   * game icon, season and round, for lists that mix seasons (player history,
   * Matches, your matches). Within one season's standings it's left out.
   */
  season?: CardSeason;
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export function MatchCard({ match, tierAccent, season }: MatchCardProps) {
  const tierClass = tierAccent ? ` match-card--tier-${tierAccent}` : '';
  return <SymmetricCard match={match} tierClass={tierClass} season={season} />;
}

/**
 * The end cap: game icon over "S4 · R2". It's also the link to the match
 * page, so cards with a cap don't need the separate info button.
 */
function EndCap({ match, season }: { match: MatchWithPlayers; season: CardSeason }) {
  const place = matchPlace(match);
  const full = [seasonName(season), place.full].filter(Boolean).join(', ');
  // An event's matches carry their own place ("R3", "UB SF1"); league ones
  // lead with the season ("S4 · R2").
  const short = isEventSeason(season)
    ? place.short ?? ''
    : [`S${season.season_index}`, place.short].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/match/${match.id}`}
      className="match-card__cap"
      title={full}
      aria-label={`View match: ${match.player1_name} vs ${match.player2_name}, ${full}`}
    >
      <TitleIcon titleId={season.title_id} />
      <span className="match-card__cap-text">
        <span className="sr-only">{titleById(season.title_id)?.name} </span>
        {short}
      </span>
    </Link>
  );
}

function SymmetricCard({ match, tierClass, season }: {
  match: MatchWithPlayers;
  tierClass: string;
  season?: CardSeason;
}) {
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
    <div className={`match-card match-card--grid${tierClass}${season ? ' match-card--capped' : ''}`}>
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

      {season ? (
        <EndCap match={match} season={season} />
      ) : (
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
      )}
    </div>
  );
}
