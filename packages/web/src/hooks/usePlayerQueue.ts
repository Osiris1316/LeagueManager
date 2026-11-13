import { useCallback, useEffect, useMemo, useState } from 'react';
import { groupMatchQueue, isEventSeason, seasonNameShort } from '@league-manager/core';
import type { MatchQueue } from '@league-manager/core';
import { getPlayer, getStandings } from '../api/client';
import type { MatchWithPlayers, PlayerDetailResponse } from '../api/client';
import { useSeasons } from '../context/SeasonsContext';

/** One line of "where this player stands", per active league. */
export interface StandingSummary {
  seasonId: number;
  seasonTag: string;
  tierName: string;
  position: number;
  wins: number;
  losses: number;
}

export interface PlayerQueue {
  status: 'idle' | 'loading' | 'ready' | 'error';
  playerId: number | null;
  playerName: string | null;
  /** Every match the player has, across all seasons. */
  matches: MatchWithPlayers[];
  queue: MatchQueue<MatchWithPlayers>;
  standings: StandingSummary[];
  /** Matches to play now: overdue plus this round. */
  dueCount: number;
  /** When the data was last loaded, for refresh-if-stale checks. */
  loadedAt: number;
  refresh: () => void;
}

const EMPTY_QUEUE: MatchQueue<MatchWithPlayers> = { overdue: [], current: [], upcoming: [] };

/**
 * Loads a player's matches and their standing in each active league, and
 * groups the unplayed matches into overdue, this round and coming up.
 * Pass `detail` when the page has already loaded the player, to skip a
 * second request.
 */
export function usePlayerQueue(
  playerId: number | null,
  detail?: PlayerDetailResponse | null,
): PlayerQueue {
  const { seasons } = useSeasons();
  const [fetched, setFetched] = useState<PlayerDetailResponse | null>(null);
  const [standings, setStandings] = useState<StandingSummary[]>([]);
  const [status, setStatus] = useState<PlayerQueue['status']>('idle');
  const [loadedAt, setLoadedAt] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);
  const preloaded = detail !== undefined;
  const data = preloaded ? detail : fetched;

  // 1. The player and their matches (skipped when the page passed them in).
  useEffect(() => {
    if (preloaded) return;
    if (playerId == null) {
      setFetched(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    getPlayer(playerId)
      .then(result => {
        if (cancelled) return;
        setFetched(result);
        setStatus('ready');
        setLoadedAt(Date.now());
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, [playerId, preloaded, tick]);

  // The active seasons this player has matches in, as a stable string key
  // (an array would look "changed" on every render).
  const leagueKey = useMemo(() => {
    if (!data) return '';
    const theirs = new Set(data.matches.map(m => m.season_id));
    return seasons
      .filter(s => s.status === 'active' && theirs.has(s.id))
      .map(s => s.id)
      .join(',');
  }, [data, seasons]);

  // 2. Where they stand in each of those leagues.
  useEffect(() => {
    if (playerId == null || leagueKey === '') {
      setStandings([]);
      return;
    }
    let cancelled = false;
    const ids = leagueKey.split(',').map(Number);
    Promise.all(ids.map(id => getStandings(id).catch(() => null)))
      .then(results => {
        if (cancelled) return;
        const lines: StandingSummary[] = [];
        for (const res of results) {
          if (!res) continue;
          for (const tier of res.tiers) {
            const index = tier.standings.findIndex(r => r.player_id === playerId);
            if (index === -1) continue;
            const row = tier.standings[index]!;
            lines.push({
              seasonId: res.season.id,
              seasonTag: seasonNameShort(res.season),
              tierName: isEventSeason(res.season) ? 'Group stage' : tier.tier.display_name,
              position: index + 1,
              wins: row.wins,
              losses: row.losses,
            });
          }
        }
        setStandings(lines);
      });
    return () => { cancelled = true; };
  }, [playerId, leagueKey, tick]);

  const queue = useMemo(
    () => (data ? groupMatchQueue(data.matches, seasons, new Date()) : EMPTY_QUEUE),
    [data, seasons],
  );

  return {
    status: preloaded ? (detail ? 'ready' : 'loading') : status,
    playerId,
    playerName: data?.player.display_name ?? null,
    matches: data?.matches ?? [],
    queue,
    standings,
    dueCount: queue.overdue.length + queue.current.length,
    loadedAt: preloaded ? Date.now() : loadedAt,
    refresh,
  };
}
