import { describe, it, expect } from 'vitest';
import type { PlayerStats } from '../../data/mockStats';
import { crFacts, parseCount } from '../crFacts';

describe('parseCount', () => {
  it.each([
    ['4,210 wins', 4210],
    ['4.210 wins', 4210],
    ['4 210', 4210],
    ['Best: 9,301', 9301],
    ['1,530 \u{1F451}', 1530],
    [12, 12],
    ['', undefined],
    [undefined, undefined],
  ])('%j -> %j', (input, expected) => {
    expect(parseCount(input as string | number | undefined)).toBe(expected);
  });
});

const base = {
  statLabels: { stat1Sub: '4,210 wins · 3,388 losses', stat4Sub: 'Best: 9,301' },
  extraStats: [
    { label: '3-Crown Wins', value: '1,530 \u{1F451}' },
    { label: 'War Day Wins', value: 12 },
    { label: 'Total Donations', value: '2,048' },
    { label: 'Clan', value: 'Lantern Watch · coLeader' },
  ],
  gameVisuals: { cr: { clanTag: '#2Y0Y' } },
} as unknown as PlayerStats;

describe('crFacts', () => {
  it('reads the numbers back from the mapper strings', () => {
    expect(crFacts(base)).toEqual({
      wins: 4210,
      losses: 3388,
      threeCrownWins: 1530,
      bestTrophies: 9301,
      donations: 2048,
      warDayWins: 12,
      clan: { name: 'Lantern Watch', tag: '#2Y0Y', role: 'coLeader' },
    });
  });

  it('has no clan when the player has no clan tag (the mapper still writes "No Clan · Member")', () => {
    const solo = { ...base, extraStats: [{ label: 'Clan', value: 'No Clan · Member' }], gameVisuals: { cr: {} } } as unknown as PlayerStats;
    expect(crFacts(solo).clan).toBeUndefined();
  });

  it('leaves missing figures undefined instead of zero', () => {
    expect(crFacts({} as PlayerStats)).toEqual({
      wins: undefined, losses: undefined, threeCrownWins: undefined, bestTrophies: undefined,
      donations: undefined, warDayWins: undefined, clan: undefined,
    });
  });

  it('splits the clan line on the last separator, so a clan name may contain one', () => {
    const named = (value: string) =>
      crFacts({ ...base, extraStats: [{ label: 'Clan', value }] } as unknown as PlayerStats).clan;
    expect(named('Foo · Bar · coLeader')).toEqual({ name: 'Foo · Bar', tag: '#2Y0Y', role: 'coLeader' });
    expect(named('Lonely clan')).toEqual({ name: 'Lonely clan', tag: '#2Y0Y', role: '' });
    expect(named('')).toBeUndefined();
  });
});
