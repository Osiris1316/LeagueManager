import type { QueueGroup } from '@league-manager/core';
import type { MatchWithPlayers } from '../../api/client';
import { useSeasonLookup } from '../../context/SeasonsContext';
import { useFollow } from '../../context/FollowContext';
import { useYourMatches } from '../../context/YourMatchesContext';
import type { PlayerQueue } from '../../hooks/usePlayerQueue';
import { FollowChip } from './FollowChip';
import { MatchTile } from './MatchTile';
import { ChevronIcon } from './icons';
import { dueSummary } from './format';

/** "Coming up" tiles shown in the ribbon; the sheet has the rest. */
const RIBBON_UPCOMING = 4;

/** One swipeable row of tiles: overdue, then this round, then the next few. */
function TileTrack({ data }: { data: PlayerQueue }) {
  const seasonById = useSeasonLookup();
  const { overdue, current, upcoming } = data.queue;

  if (data.status === 'loading' && data.matches.length === 0) {
    return <span className="ym-ribbon__text">Loading…</span>;
  }
  if (overdue.length + current.length + upcoming.length === 0) {
    return <span className="ym-ribbon__text">All caught up</span>;
  }

  const tiles: { match: MatchWithPlayers; group: QueueGroup }[] = [
    ...overdue.map(match => ({ match, group: 'overdue' as const })),
    ...current.map(match => ({ match, group: 'current' as const })),
    ...upcoming.slice(0, RIBBON_UPCOMING).map(match => ({ match, group: 'upcoming' as const })),
  ];

  return (
    <div className="ym-ribbon__track">
      {tiles.map(({ match, group }) => {
        const season = seasonById(match.season_id);
        return (
          <MatchTile
            key={match.id}
            match={match}
            playerId={data.playerId}
            group={group}
            season={season}
          />
        );
      })}
    </div>
  );
}

/**
 * Phones, every page: the followed player's chip and their match tiles in one
 * slim row under the nav. Tap the chip for the full list in the bottom sheet;
 * the arrow folds the row down to just the chip.
 */
export function FollowedRibbon() {
  const { followedPlayerId } = useFollow();
  const { followed, panelOpen, openPanel, ribbonCollapsed, setRibbonCollapsed } = useYourMatches();
  const { overdue, current, upcoming } = followed.queue;

  return (
    <div className={`ym-ribbon${ribbonCollapsed ? ' ym-ribbon--collapsed' : ''}`} role="region" aria-label="Your matches">
      <FollowChip onClick={openPanel} expanded={panelOpen} />

      {followedPlayerId == null ? (
        !ribbonCollapsed && (
          <button type="button" className="ym-ribbon__prompt" onClick={openPanel}>
            Follow a player to see their matches here
          </button>
        )
      ) : ribbonCollapsed ? (
        <button type="button" className="ym-ribbon__text ym-ribbon__summary" onClick={openPanel}>
          {dueSummary(overdue.length, current.length, upcoming.length)}
        </button>
      ) : (
        <TileTrack data={followed} />
      )}

      <button
        type="button"
        className="ym-icon-btn ym-ribbon__toggle"
        onClick={() => setRibbonCollapsed(!ribbonCollapsed)}
        aria-expanded={!ribbonCollapsed}
        aria-label={ribbonCollapsed ? 'Show match tiles' : 'Fold match tiles away'}
      >
        <ChevronIcon up={!ribbonCollapsed} />
      </button>
    </div>
  );
}

/** Phones, player page: the viewed player's tiles under their name. */
export function PlayerRibbon({ data }: { data: PlayerQueue }) {
  return (
    <div className="ym-ribbon ym-ribbon--player" role="region" aria-label="Upcoming matches">
      <span className="ym-ribbon__label">Upcoming</span>
      <TileTrack data={data} />
    </div>
  );
}
