import { describe, it, expect } from 'vitest';
import type { PlayerStats } from '../../../data/mockStats';
import { GAME_TABS, tabCounts } from '../tabs';

const stats = (extraStats: PlayerStats['extraStats']) => ({ extraStats }) as PlayerStats;

describe('GAME_TABS', () => {
  it('keeps the public ids of the spec', () => {
    expect(GAME_TABS['clash-royale'].map((t) => t.id)).toEqual(['overview', 'cards', 'deck', 'battles', 'towers']);
    expect(GAME_TABS['brawl-stars'].map((t) => t.id)).toEqual(['overview', 'brawlers', 'progression', 'battles', 'club']);
  });
});

describe('tabCounts', () => {
  it('shows found / in game on the Clash Royale Cards tab', () => {
    expect(tabCounts('clash-royale', stats([{ label: 'Cards Found', value: '12 / 123' }]))).toEqual({ cards: '12/123' });
  });
  it('shows the found count alone when the catalogue was unavailable', () => {
    expect(tabCounts('clash-royale', stats([{ label: 'Cards Found', value: '12' }]))).toEqual({ cards: '12' });
  });
  it('shows nothing when the figure is missing, and nothing for other games', () => {
    expect(tabCounts('clash-royale', stats(undefined))).toEqual({});
    expect(tabCounts('brawl-stars', stats([{ label: 'Cards Found', value: '12 / 123' }]))).toEqual({});
  });
  it('shows unlocked / in game on the Brawl Stars Brawlers tab, or unlocked alone', () => {
    const bs = (count: number, stat3Sub: string) =>
      ({ statLabels: { stat3Sub }, gameVisuals: { bs: { allBrawlers: Array.from({ length: count }) } } }) as unknown as PlayerStats;
    expect(tabCounts('brawl-stars', bs(107, '107/109 brawlers unlocked'))).toEqual({ brawlers: '107/109' });
    expect(tabCounts('brawl-stars', bs(6, '6 brawlers unlocked'))).toEqual({ brawlers: '6' });
    expect(tabCounts('brawl-stars', bs(0, '0 brawlers unlocked'))).toEqual({});
  });
});
