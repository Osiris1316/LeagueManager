import { Link } from 'react-router-dom';
import type { QueueGroup } from '@league-manager/core';
import type { MatchWithPlayers } from '../../api/client';
import { GROUP_LABELS, opponentName, shortWhen } from './format';

interface MatchTileProps {
  match: MatchWithPlayers;
  playerId: number | null;
  group: QueueGroup;
  seasonTag?: string;
}

/** A small swipeable tile for the ribbon: opponent, league, round, status edge. */
export function MatchTile({ match, playerId, group, seasonTag }: MatchTileProps) {
  const meta = [
    seasonTag,
    match.round_number != null ? `R${match.round_number}` : null,
    match.scheduled_at ? shortWhen(match.scheduled_at) : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/match/${match.id}`}
      className={`match-tile match-tile--${group}`}
      aria-label={`${GROUP_LABELS[group]}: versus ${opponentName(match, playerId)}${meta ? `, ${meta}` : ''}`}
    >
      <span className="match-tile__opponent">vs {opponentName(match, playerId)}</span>
      <span className="match-tile__meta">{meta}</span>
    </Link>
  );
}
