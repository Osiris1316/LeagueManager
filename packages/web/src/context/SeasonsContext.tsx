import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getSeasons } from '../api/client';
import type { Season } from '../api/client';

interface SeasonsContextValue {
  /** All seasons, newest first (API sorts by season_number DESC). */
  seasons: Season[];
  loading: boolean;
  error: string | null;
  /**
   * The season to show when none is explicitly requested:
   * the active one, falling back to the most recent.
   */
  defaultSeasonId: number | null;
  refresh: () => void;
}

const SeasonsContext = createContext<SeasonsContextValue>({
  seasons: [],
  loading: false,
  error: null,
  defaultSeasonId: null,
  refresh: () => {},
});

export function SeasonsProvider({ children }: { children: ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSeasons(await getSeasons());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load seasons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const defaultSeasonId =
    seasons.find(s => s.status === 'active')?.id ?? seasons[0]?.id ?? null;

  return (
    <SeasonsContext.Provider value={{ seasons, loading, error, defaultSeasonId, refresh: load }}>
      {children}
    </SeasonsContext.Provider>
  );
}

export function useSeasons() {
  return useContext(SeasonsContext);
}
