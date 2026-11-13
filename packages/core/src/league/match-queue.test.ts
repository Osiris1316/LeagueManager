import { describe, expect, it } from 'vitest';
import { groupMatchQueue, queueGroupFor, roundWindow } from './match-queue.js';
import type { QueueMatch, QueueSeason } from './match-queue.js';

/** Local midnight on a calendar day, the same way the queue reads dates. */
const day = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

const aoe: QueueSeason = { id: 5, status: 'active', started_at: '2026-10-29' };
const bw: QueueSeason = { id: 4, status: 'active', started_at: '2026-09-03' };

let nextId = 1;
const match = (season_id: number, round_number: number | null, extra: Partial<QueueMatch> = {}): QueueMatch => ({
  id: nextId++,
  season_id,
  round_number,
  status: 'pending',
  scheduled_at: null,
  ...extra,
});

describe('roundWindow', () => {
  it('opens round 1 on the start date and each round a week later', () => {
    expect(roundWindow('2026-10-29', 1)).toEqual({ opens: day(2026, 10, 29), closes: day(2026, 11, 5) });
    expect(roundWindow('2026-10-29', 3)).toEqual({ opens: day(2026, 11, 12), closes: day(2026, 11, 19) });
  });

  it('accepts a datetime and ignores the time part', () => {
    expect(roundWindow('2026-10-29 18:30:00', 1)?.opens).toEqual(day(2026, 10, 29));
  });

  it('returns null without a usable start date or round', () => {
    expect(roundWindow(null, 1)).toBeNull();
    expect(roundWindow('not a date', 1)).toBeNull();
    expect(roundWindow('2026-10-29', null)).toBeNull();
    expect(roundWindow('2026-10-29', 0)).toBeNull();
  });
});

describe('queueGroupFor', () => {
  const window = roundWindow('2026-10-29', 2)!; // Nov 5 to Nov 12

  it('is current from the moment the round opens until it closes', () => {
    expect(queueGroupFor(window, day(2026, 11, 5))).toBe('current');
    expect(queueGroupFor(window, day(2026, 11, 11, 23))).toBe('current');
  });

  it('is overdue once the round has closed and upcoming before it opens', () => {
    expect(queueGroupFor(window, day(2026, 11, 12))).toBe('overdue');
    expect(queueGroupFor(window, day(2026, 11, 4, 23))).toBe('upcoming');
  });

  it('treats a match it cannot place in time as current', () => {
    expect(queueGroupFor(null, day(2026, 11, 6))).toBe('current');
  });
});

describe('groupMatchQueue', () => {
  const now = day(2026, 11, 6, 12); // AoE4 round 2 is open; every BW round has closed

  it('splits matches into overdue, current and upcoming', () => {
    const r1 = match(5, 1);
    const r2 = match(5, 2);
    const r3 = match(5, 3);
    const queue = groupMatchQueue([r3, r2, r1], [aoe], now);
    expect(queue).toEqual({ overdue: [r1], current: [r2], upcoming: [r3] });
  });

  it('leaves out played matches and seasons that are not active', () => {
    const played = match(5, 2, { status: 'complete' });
    const pendingSeason: QueueSeason = { id: 6, status: 'pending', started_at: '2026-11-01' };
    const doneSeason: QueueSeason = { id: 3, status: 'complete', started_at: '2026-07-30' };
    const queue = groupMatchQueue(
      [played, match(6, 1), match(3, 1), match(99, 1)],
      [aoe, pendingSeason, doneSeason],
      now,
    );
    expect(queue).toEqual({ overdue: [], current: [], upcoming: [] });
  });

  it('lists overdue matches oldest round first, across leagues', () => {
    const bwR9 = match(4, 9);   // Oct 29 to Nov 5
    const aoeR1 = match(5, 1);  // also Oct 29 to Nov 5, so the older match id breaks the tie
    const bwR2 = match(4, 2);   // Sep 10 to Sep 17
    const queue = groupMatchQueue([aoeR1, bwR9, bwR2], [aoe, bw], now);
    expect(queue.overdue).toEqual([bwR2, bwR9, aoeR1]);
  });

  it('puts scheduled matches first within the current round', () => {
    const unscheduled = match(5, 2);
    const later = match(5, 2, { scheduled_at: '2026-11-09T20:00:00' });
    const sooner = match(5, 2, { scheduled_at: '2026-11-07T20:00:00' });
    const queue = groupMatchQueue([unscheduled, later, sooner], [aoe], now);
    expect(queue.current).toEqual([sooner, later, unscheduled]);
  });

  it('counts every match as upcoming before the season starts', () => {
    const future: QueueSeason = { id: 7, status: 'active', started_at: '2026-12-03' };
    const r1 = match(7, 1);
    const r2 = match(7, 2);
    expect(groupMatchQueue([r2, r1], [future], now)).toEqual({ overdue: [], current: [], upcoming: [r1, r2] });
  });

  it('counts matches without a round or start date as current', () => {
    const undated: QueueSeason = { id: 8, status: 'active', started_at: null };
    const a = match(8, 1);
    const b = match(5, null);
    const queue = groupMatchQueue([a, b], [undated, aoe], now);
    expect(queue.current).toEqual([a, b]);
  });
});

describe('groupMatchQueue for an event', () => {
  it('treats every round as playable now, since an event is played in one sitting', () => {
    const event: QueueSeason = { id: 9, status: 'active', started_at: '2026-11-14', format: 'tournament' };
    const r1 = match(9, 1);
    const r7 = match(9, 7);
    const bracket = match(9, null);
    const q = groupMatchQueue([r7, r1, bracket], [event], day(2026, 11, 14, 10));
    expect(q.current.map((m) => m.id).sort()).toEqual([r1.id, r7.id, bracket.id].sort());
    expect(q.upcoming).toEqual([]);
    expect(q.overdue).toEqual([]);
  });
});
