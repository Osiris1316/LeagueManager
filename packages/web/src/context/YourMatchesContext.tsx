import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useFollow } from './FollowContext';
import { usePlayerQueue } from '../hooks/usePlayerQueue';
import type { PlayerQueue } from '../hooks/usePlayerQueue';
import { useStoredFlag } from '../hooks/useStoredFlag';

/** Reload the followed player's matches on navigation once data is this old. */
const STALE_AFTER_MS = 60_000;

interface YourMatchesContextValue {
  /** The followed player's matches, shared by the chip, ribbon, panel and sheet. */
  followed: PlayerQueue;
  /** Whether the slide-in panel (desktop) or bottom sheet (phone) is open. */
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  /** Desktop standings: panel pinned as a column instead of sliding in. */
  pinned: boolean;
  setPinned: (pinned: boolean) => void;
  /** Phones: ribbon folded down to just the chip. */
  ribbonCollapsed: boolean;
  setRibbonCollapsed: (collapsed: boolean) => void;
}

const YourMatchesContext = createContext<YourMatchesContextValue | null>(null);

export function YourMatchesProvider({ children }: { children: ReactNode }) {
  const { followedPlayerId } = useFollow();
  const followed = usePlayerQueue(followedPlayerId);
  const location = useLocation();

  const [panelOpen, setPanelOpen] = useState(false);
  const [pinned, setPinned] = useStoredFlag('ui.your_matches_pinned', false);
  const [ribbonCollapsed, setRibbonCollapsed] = useStoredFlag('ui.your_matches_ribbon_collapsed', false);

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen(open => !open), []);

  // Keep the latest values in a ref so the listeners below don't need to be
  // re-attached every time the data changes.
  const latest = useRef(followed);
  latest.current = followed;

  const refreshIfStale = useCallback(() => {
    const q = latest.current;
    if (q.playerId != null && q.status === 'ready' && Date.now() - q.loadedAt > STALE_AFTER_MS) {
      q.refresh();
    }
  }, []);

  // Moving to another page closes the slide-in panel or sheet, and picks up
  // results reported since the last load.
  useEffect(() => {
    setPanelOpen(false);
    refreshIfStale();
  }, [location.pathname, refreshIfStale]);

  // Coming back to the tab also refreshes stale data.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshIfStale();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshIfStale]);

  return (
    <YourMatchesContext.Provider value={{
      followed,
      panelOpen,
      openPanel,
      closePanel,
      togglePanel,
      pinned,
      setPinned,
      ribbonCollapsed,
      setRibbonCollapsed,
    }}>
      {children}
    </YourMatchesContext.Provider>
  );
}

export function useYourMatches(): YourMatchesContextValue {
  const value = useContext(YourMatchesContext);
  if (!value) throw new Error('useYourMatches must be used inside YourMatchesProvider');
  return value;
}
