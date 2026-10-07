import { describe, it, expect } from 'vitest';
import type { BSBrawlerData } from '../../data/mockStats';
import { brawlerList, rarityWeight } from '../bsBrawlerList';

const b = (name: string, trophies: number, power = 11) => ({ id: trophies, name, trophies, power }) as BSBrawlerData;
const list = [b('SHELLY', 1210), b('8-BIT', 980), b('COLT', 750, 9), b('MR. P', 420, 7), b('EL PRIMO', 120, 3), b('GLOWY', 0, 1), b('NEWBIE', 50, 2)];
const names = (l: BSBrawlerData[]) => l.map((x) => x.name);

describe('rarityWeight', () => {
  it('reads the static table, spaces as dashes, and gives unknown brawlers weight 0', () => {
    expect(rarityWeight('SHELLY')).toBe(1);
    expect(rarityWeight('EL PRIMO')).toBe(2);
    expect(rarityWeight('GLOWY')).toBe(5);
    expect(rarityWeight('NEWBIE')).toBe(0);
  });
});

describe('brawlerList', () => {
  it('sorts by trophies both ways, by rarity, power and name', () => {
    expect(names(brawlerList(list, '', 'trophies'))).toEqual(['SHELLY', '8-BIT', 'COLT', 'MR. P', 'EL PRIMO', 'NEWBIE', 'GLOWY']);
    expect(names(brawlerList(list, '', 'trophies-asc'))).toEqual(['GLOWY', 'NEWBIE', 'EL PRIMO', 'MR. P', 'COLT', '8-BIT', 'SHELLY']);
    expect(names(brawlerList(list, '', 'rarity'))).toEqual(['NEWBIE', 'MR. P', 'GLOWY', '8-BIT', 'COLT', 'EL PRIMO', 'SHELLY']);
    expect(names(brawlerList(list, '', 'power'))).toEqual(['SHELLY', '8-BIT', 'COLT', 'MR. P', 'EL PRIMO', 'NEWBIE', 'GLOWY']);
    expect(names(brawlerList(list, '', 'name'))).toEqual(['8-BIT', 'COLT', 'EL PRIMO', 'GLOWY', 'MR. P', 'NEWBIE', 'SHELLY']);
  });
  it('filters by name in any case and never mutates the input', () => {
    const copy = [...list];
    expect(names(brawlerList(list, '  el ', 'trophies'))).toEqual(['SHELLY', 'EL PRIMO']);
    expect(brawlerList(list, 'zzz', 'trophies')).toEqual([]);
    expect(list).toEqual(copy);
  });
});
