import { describe, it, expect } from 'vitest';
import { orderSeasonsChronologically, seasonIdsSince } from './seasons';

// Global numbering as in production: AoE4 S1–S3 = 1–3, BW S1 = 4, AoE4 S4 = 5.
const aoe4 = [
  { id: 5, startedAt: '2026-10-28', seasonNumber: 5 },
  { id: 1, startedAt: '2026-05-18', seasonNumber: 1 },
  { id: 3, startedAt: '2026-07-27 00:00:00', seasonNumber: 3 },
  { id: 2, startedAt: '2026-06-22', seasonNumber: 2 },
];

describe('orderSeasonsChronologically', () => {
  it('orders by start date, ignoring any time part', () => {
    expect(orderSeasonsChronologically(aoe4)).toEqual([1, 2, 3, 5]);
  });

  it('puts seasons without a start date last, then by season number', () => {
    const rows = [...aoe4, { id: 9, startedAt: null, seasonNumber: 9 }, { id: 8, startedAt: null, seasonNumber: 8 }];
    expect(orderSeasonsChronologically(rows)).toEqual([1, 2, 3, 5, 8, 9]);
  });

  it('a showmatch slots in by its date, whatever its number', () => {
    const rows = [...aoe4, { id: 7, startedAt: '2026-08-15', seasonNumber: 7 }];
    expect(orderSeasonsChronologically(rows)).toEqual([1, 2, 3, 7, 5]);
  });

  it('same start date falls back to season number', () => {
    const rows = [{ id: 2, startedAt: '2026-01-01', seasonNumber: 2 }, { id: 1, startedAt: '2026-01-01', seasonNumber: 1 }];
    expect(orderSeasonsChronologically(rows)).toEqual([1, 2]);
  });
});

describe('seasonIdsSince', () => {
  const ordered = [1, 2, 3, 5];
  it('includes the chosen season and everything after it', () => {
    expect(seasonIdsSince(ordered, 2)).toEqual(new Set([2, 3, 5]));
  });
  it('the newest season alone', () => {
    expect(seasonIdsSince(ordered, 5)).toEqual(new Set([5]));
  });
  it('no since, or an unknown season, means no limit', () => {
    expect(seasonIdsSince(ordered, null)).toBeNull();
    expect(seasonIdsSince(ordered, 4)).toBeNull();
  });
});
