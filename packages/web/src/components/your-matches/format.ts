import type { QueueGroup } from '@league-manager/core';
import type { MatchWithPlayers } from '../../api/client';

export const GROUP_LABELS: Record<QueueGroup, string> = {
  overdue: 'Overdue',
  current: 'This round',
  upcoming: 'Coming up',
};

/** "Osiris" → "OS", "Not_A_Beaver" → "NA". */
export function initials(name: string | null): string {
  if (!name) return '?';
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  const letters = words.length >= 2 ? words[0]![0]! + words[1]![0]! : (words[0] ?? name).slice(0, 2);
  return letters.toUpperCase();
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 23 → "23rd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** The other player's name, from this player's point of view. */
export function opponentName(match: MatchWithPlayers, playerId: number | null): string {
  if (match.player1_id === playerId) return match.player2_name;
  if (match.player2_id === playerId) return match.player1_name;
  return `${match.player1_name} vs ${match.player2_name}`;
}

/** "Thu 8:00 PM" for a scheduled match. */
export function shortWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

/** Screen-reader summary of the queue, e.g. "1 overdue, 2 this round". */
export function dueSummary(overdue: number, current: number, upcoming: number): string {
  const parts: string[] = [];
  if (overdue) parts.push(`${overdue} overdue`);
  if (current) parts.push(`${current} this round`);
  if (upcoming) parts.push(`${upcoming} coming up`);
  return parts.length ? parts.join(', ') : 'all caught up';
}
