import { describe, it, expect } from 'vitest';
import { CIVS } from './civs';

describe('civ catalog short names', () => {
  it('every civ has a short name of at most 11 characters', () => {
    // 11 characters is what fits beside a flag in the head-to-head game rows
    // at their narrowest width with names shown.
    for (const civ of CIVS) {
      expect(civ.short.length, civ.name).toBeGreaterThan(0);
      expect(civ.short.length, civ.name).toBeLessThanOrEqual(11);
    }
  });

  it('short names are unique, so no two civs read the same', () => {
    expect(new Set(CIVS.map((c) => c.short)).size).toBe(CIVS.length);
  });
});
