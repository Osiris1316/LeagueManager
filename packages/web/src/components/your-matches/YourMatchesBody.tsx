import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useFollow } from '../../context/FollowContext';
import { useYourMatches } from '../../context/YourMatchesContext';
import { PlayerPicker } from './PlayerPicker';
import { QueueList } from './QueueList';

/** Title row shared by the side panel and the bottom sheet. */
export function YourMatchesHeader({ titleId, actions }: { titleId: string; actions?: ReactNode }) {
  const { followedPlayerId } = useFollow();
  const { followed } = useYourMatches();
  return (
    <div className="ym-header">
      <div className="ym-header__text">
        <h2 id={titleId} className="ym-header__title">Your matches</h2>
        {followedPlayerId != null && followed.playerName && (
          <p className="ym-header__sub">
            Following <Link to={`/player/${followedPlayerId}`}>{followed.playerName}</Link>
          </p>
        )}
      </div>
      {actions && <div className="ym-header__actions">{actions}</div>}
    </div>
  );
}

/**
 * The panel and sheet contents: the followed player's queue, or a player
 * picker when nobody is followed yet (or you choose "Change player").
 */
export function YourMatchesBody() {
  const { followedPlayerId, follow, unfollow } = useFollow();
  const { followed } = useYourMatches();
  const [changing, setChanging] = useState(false);

  if (followedPlayerId == null || changing) {
    return (
      <div className="ym-body">
        <p className="ym-intro">
          Pick a player to follow. Their matches show up here, sorted into overdue,
          this round and coming up. This is saved in this browser only.
        </p>
        <PlayerPicker
          selectedId={followedPlayerId}
          onPick={id => { follow(id); setChanging(false); }}
        />
        {changing && (
          <button type="button" className="ym-link-btn" onClick={() => setChanging(false)}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ym-body">
      <QueueList data={followed} />
      <div className="ym-footer">
        <Link to={`/player/${followedPlayerId}`} className="ym-link-btn">Player page</Link>
        <button type="button" className="ym-link-btn" onClick={() => setChanging(true)}>
          Change player
        </button>
        <button type="button" className="ym-link-btn" onClick={unfollow}>
          Stop following
        </button>
      </div>
    </div>
  );
}
