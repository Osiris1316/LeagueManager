import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

const STORAGE_KEY = 'followed_player_id';

interface FollowContextValue {
  /** The player being followed, or null when nobody is followed. */
  followedPlayerId: number | null;
  follow: (playerId: number) => void;
  unfollow: () => void;
  isFollowing: (playerId: number) => boolean;
}

const FollowContext = createContext<FollowContextValue>({
  followedPlayerId: null,
  follow: () => {},
  unfollow: () => {},
  isFollowing: () => false,
});

/** Reads the stored id, tolerating private mode / disabled storage. */
function readStoredPlayerId(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const id = Number.parseInt(raw, 10);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

function writeStoredPlayerId(id: number | null) {
  try {
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(id));
  } catch {
    // Storage unavailable — the setting just won't persist between reloads.
  }
}

export function FollowProvider({ children }: { children: ReactNode }) {
  const [followedPlayerId, setFollowedPlayerId] = useState<number | null>(readStoredPlayerId);

  // Keep other tabs in sync.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setFollowedPlayerId(readStoredPlayerId());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const follow = useCallback((playerId: number) => {
    setFollowedPlayerId(playerId);
    writeStoredPlayerId(playerId);
  }, []);

  const unfollow = useCallback(() => {
    setFollowedPlayerId(null);
    writeStoredPlayerId(null);
  }, []);

  const isFollowing = useCallback(
    (playerId: number) => followedPlayerId === playerId,
    [followedPlayerId]
  );

  return (
    <FollowContext.Provider value={{ followedPlayerId, follow, unfollow, isFollowing }}>
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  return useContext(FollowContext);
}
