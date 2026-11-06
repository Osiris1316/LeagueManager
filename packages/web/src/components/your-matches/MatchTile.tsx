import { Link } from 'react-router-dom';
import { seasonLabel } from '@league-manager/core';
import type { QueueGroup } from '@league-manager/core';
import type { MatchWithPlayers } from '../../api/client';
import type { CardSeason } from '../MatchCard';
import { TitleIcon } from '../TitleIcon';
import { GROUP_LABELS, opponentName, shortWhen } from './format';

interface MatchTileProps {
  match: MatchWithPlayers;
  playerId: number | null;
  group: QueueGroup;
  season?: CardSeason;
}

/** A small swipeable tile for the ribbon: opponent, then game icon, season, round. */
export function MatchTile({ match, playerId, group, season }: MatchTileProps) {
  const meta = [
    season ? `S${season.season_index}` : null,
    match.round_number != null ? `R${match.round_number}` : null,
    match.scheduled_at ? shortWhen(match.scheduled_at) : null,
  ].filter(Boolean).join(' · ');

  const spoken = [
    season ? seasonLabel(season.title_id, season.season_index) : null,
    match.round_number != null ? `round ${match.round_number}` : null,
    match.scheduled_at ? shortWhen(match.scheduled_at) : null,
  ].filter(Boolean).join(', ');

  return (
    <Link
      to={`/match/${match.id}`}
      className={`match-tile match-tile--${group}`}
      aria-label={`${GROUP_LABELS[group]}: versus ${opponentName(match, playerId)}${spoken ? `, ${spoken}` : ''}`}
    >
      <span className="match-tile__opponent">vs {opponentName(match, playerId)}</span>
      <span className="match-tile__meta">
        {season && <TitleIcon titleId={season.title_id} />}
        {meta}
      </span>
    </Link>
  );
}
