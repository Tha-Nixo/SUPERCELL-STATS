import { describe, it, expect } from 'vitest';
import { getGameById } from '../../../data/games';
import type { PlayerStats } from '../../../data/mockStats';
import { buildSummary, leagueLabel } from '../summary';

describe('leagueLabel', () => {
  it.each([
    ['41,234 🏆', undefined],
    ['322259 🏆', undefined],
    ['Legendary Arena', 'Legendary Arena'],
    ['⚜️ Grandmaster', 'Grandmaster'],
    ['', undefined],
    [undefined, undefined],
  ])('%j -> %j', (rank, expected) => {
    expect(leagueLabel(rank)).toBe(expected);
  });
});

describe('buildSummary level', () => {
  const coc = getGameById('clash-of-clans')!;
  const stats = (level: number) => ({ username: 'Harrow Keep', trophies: 5000, level, rank: '' }) as PlayerStats;
  it('keeps a real level', () => {
    expect(buildSummary(coc, stats(300), '2PP0LQ').level).toBe(300);
  });
  it('drops the 0 the mapper uses for a missing level, so no "Level 0" pill shows', () => {
    expect(buildSummary(coc, stats(0), '2PP0LQ').level).toBeUndefined();
  });
});
