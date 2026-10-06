import { describe, it, expect } from 'vitest';
import {
  battleModes, filterBattles, modeSlug, NO_FILTERS, parseBattleFilters, resultCounts, shareableFilters, trophyLabel, trophyQualifier, withBattleFilters,
  type BattleLike,
} from '../battleFilters';

const battles: BattleLike[] = [
  { mode: 'Ladder', result: 'win' },
  { mode: 'Path of Legend', result: 'loss' },
  { mode: 'Ladder', result: 'loss' },
  { mode: 'Ladder', result: 'draw' },
  { mode: 'Path of Legend', result: 'win' },
  { mode: 'River Race', result: 'win' },
];

describe('modeSlug', () => {
  it.each([
    ['Ladder', 'ladder'],
    ['Path of Legend', 'path-of-legend'],
    ['2v2 Challenge!', '2v2-challenge'],
    ['Méga Draft', 'mega-draft'],
    ['All', 'all-mode'],
    ['***', 'other'],
  ])('%j -> %j', (mode, slug) => {
    expect(modeSlug(mode)).toBe(slug);
  });
});

describe('battleModes', () => {
  it('lists each mode once, most played first, ties by name', () => {
    expect(battleModes(battles)).toEqual([
      { slug: 'ladder', label: 'Ladder', count: 3 },
      { slug: 'path-of-legend', label: 'Path of Legend', count: 2 },
      { slug: 'river-race', label: 'River Race', count: 1 },
    ]);
  });
  it('counts within the result filter but keeps every mode (no moving controls)', () => {
    expect(battleModes(battles, 'loss')).toEqual([
      { slug: 'ladder', label: 'Ladder', count: 1 },
      { slug: 'path-of-legend', label: 'Path of Legend', count: 1 },
      { slug: 'river-race', label: 'River Race', count: 0 },
    ]);
  });
  it('is empty for no battles', () => {
    expect(battleModes([])).toEqual([]);
  });
});

describe('resultCounts', () => {
  it('counts every result, or only the selected mode', () => {
    expect(resultCounts(battles, 'all')).toEqual({ all: 6, win: 3, loss: 2, draw: 1 });
    expect(resultCounts(battles, 'ladder')).toEqual({ all: 3, win: 1, loss: 1, draw: 1 });
  });
});

describe('parseBattleFilters', () => {
  const modes = battleModes(battles);
  it('reads known values, case-insensitively', () => {
    expect(parseBattleFilters('?tab=battles&mode=Path-Of-Legend&result=LOSS', modes)).toEqual({ mode: 'path-of-legend', result: 'loss' });
  });
  it('falls back to all for missing, empty or unknown values', () => {
    expect(parseBattleFilters('', modes)).toEqual(NO_FILTERS);
    expect(parseBattleFilters('?mode=&result=', modes)).toEqual(NO_FILTERS);
    expect(parseBattleFilters('?mode=brawl-ball&result=victory', modes)).toEqual(NO_FILTERS);
  });
  it('drops a mode this player has no battle in (an old shared link)', () => {
    expect(parseBattleFilters('?mode=ladder', battleModes([{ mode: 'River Race', result: 'win' }]))).toEqual(NO_FILTERS);
  });
});

describe('withBattleFilters', () => {
  it('writes non-default filters after the existing parameters', () => {
    expect(withBattleFilters('?tab=battles', { mode: 'ladder', result: 'win' })).toBe('?tab=battles&mode=ladder&result=win');
  });
  it('removes defaults and keeps the rest', () => {
    expect(withBattleFilters('?tab=battles&mode=ladder&result=win', { mode: 'all', result: 'win' })).toBe('?tab=battles&result=win');
    expect(withBattleFilters('?mode=ladder', NO_FILTERS)).toBe('');
  });
  it('round-trips through parseBattleFilters', () => {
    const modes = battleModes(battles);
    const filters = { mode: 'river-race', result: 'draw' } as const;
    expect(parseBattleFilters(withBattleFilters('?tab=battles', filters), modes)).toEqual(filters);
  });
});

describe('filterBattles', () => {
  it('applies both filters', () => {
    expect(filterBattles(battles, { mode: 'ladder', result: 'loss' })).toEqual([{ mode: 'Ladder', result: 'loss' }]);
    expect(filterBattles(battles, { mode: 'all', result: 'win' })).toHaveLength(3);
    expect(filterBattles(battles, NO_FILTERS)).toEqual(battles);
    expect(filterBattles(battles, { mode: 'river-race', result: 'loss' })).toEqual([]);
  });
});

describe('shareableFilters', () => {
  const modes = battleModes([{ mode: 'Ladder', result: 'win' }, { mode: 'River Race', result: 'loss' }]);
  it('keeps the filters that are valid for this player', () => {
    expect(shareableFilters('?tab=battles&mode=ladder&result=loss&ref=x', modes)).toEqual({ mode: 'ladder', result: 'loss' });
  });
  it('drops unknown modes and results, and the "all" values', () => {
    expect(shareableFilters('?mode=brawl-ball&result=victory', modes)).toEqual({});
    expect(shareableFilters('?mode=all&result=all', modes)).toEqual({});
    expect(shareableFilters('?mode=LADDER', modes)).toEqual({ mode: 'ladder' });
  });
});

describe('trophyLabel', () => {
  it('names the separate Path of Legend counter, plain Trophies elsewhere', () => {
    expect(trophyLabel('Path of Legend')).toBe('Path of Legend trophies');
    expect(trophyLabel('Ladder')).toBe('Trophies');
  });

  it('gives a short visible qualifier only for the Path of Legend counter', () => {
    expect(trophyQualifier('Path of Legend')).toBe('PoL');
    expect(trophyQualifier('Ladder')).toBeNull();
    expect(trophyQualifier('Special event')).toBeNull();
  });
});
