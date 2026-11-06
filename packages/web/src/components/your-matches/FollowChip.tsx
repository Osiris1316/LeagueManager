import { useFollow } from '../../context/FollowContext';
import { useYourMatches } from '../../context/YourMatchesContext';
import { dueSummary, initials } from './format';

export const CHIP_ID = 'your-matches-chip';

interface FollowChipProps {
  onClick: () => void;
  expanded: boolean;
}

/**
 * The followed player's initials with a count of matches to play now, and an
 * amber dot when something is overdue. Opens the panel (desktop) or sheet
 * (phone). With nobody followed, it invites you to follow someone.
 */
export function FollowChip({ onClick, expanded }: FollowChipProps) {
  const { followedPlayerId } = useFollow();
  const { followed } = useYourMatches();
  const { overdue, current, upcoming } = followed.queue;

  if (followedPlayerId == null) {
    return (
      <button
        id={CHIP_ID}
        type="button"
        className="follow-chip follow-chip--empty"
        onClick={onClick}
        aria-haspopup="dialog"
        aria-expanded={expanded}
      >
        <span aria-hidden="true">+</span> Follow
      </button>
    );
  }

  const name = followed.playerName;
  const label = name
    ? `Your matches, following ${name}: ${dueSummary(overdue.length, current.length, upcoming.length)}`
    : 'Your matches';

  return (
    <button
      id={CHIP_ID}
      type="button"
      className={`follow-chip${overdue.length ? ' follow-chip--overdue' : ''}`}
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={label}
      title={label}
    >
      <span className="follow-chip__avatar" aria-hidden="true">{initials(name)}</span>
      {followed.dueCount > 0 && (
        <span className="follow-chip__count" aria-hidden="true">{followed.dueCount}</span>
      )}
      {overdue.length > 0 && <span className="follow-chip__dot" aria-hidden="true" />}
    </button>
  );
}
