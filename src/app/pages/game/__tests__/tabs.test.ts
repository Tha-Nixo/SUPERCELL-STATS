import { describe, it, expect } from 'vitest';
import type { PlayerStats } from '../../../data/mockStats';
import { GAME_TABS, tabCounts } from '../tabs';

const stats = (extraStats: PlayerStats['extraStats']) => ({ extraStats }) as PlayerStats;

describe('GAME_TABS', () => {
  it('keeps the public ids of the spec', () => {
    expect(GAME_TABS['clash-royale'].map((t) => t.id)).toEqual(['overview', 'cards', 'deck', 'battles', 'towers']);
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
});
