import { brawlerRarityMap } from '../data/brawlerRarities';
import type { BSBrawlerData } from '../data/mockStats';

export type BrawlerSort = 'trophies' | 'trophies-asc' | 'rarity' | 'power' | 'name';

/** Sort options of the Brawlers tab, in menu order. */
export const BRAWLER_SORTS: ReadonlyArray<[BrawlerSort, string]> = [
  ['trophies', 'Most trophies'],
  ['trophies-asc', 'Fewest trophies'],
  ['rarity', 'Rarest first'],
  ['power', 'Highest power'],
  ['name', 'Name'],
];

const RARITY_WEIGHT: Record<string, number> = {
  Common: 1, Rare: 2, 'Super Rare': 3, Epic: 4, Mythic: 5, Legendary: 6, 'Ultra Legendary': 7,
};

/**
 * Rarity rank from the static table in data/brawlerRarities.ts (the API does
 * not send rarity). A brawler newer than the table weighs 0: the sort puts
 * those first, since they are the newest.
 */
export function rarityWeight(name: string): number {
  return RARITY_WEIGHT[brawlerRarityMap[name.toUpperCase().replace(/ /g, '-')] ?? ''] ?? 0;
}

/** The brawlers whose name contains `query` (any case), in `sort` order; ties by trophies, then name. */
export function brawlerList(brawlers: readonly BSBrawlerData[], query: string, sort: BrawlerSort): BSBrawlerData[] {
  const q = query.trim().toLowerCase();
  const byTrophies = (a: BSBrawlerData, b: BSBrawlerData) => b.trophies - a.trophies || a.name.localeCompare(b.name);
  const rarest = (name: string) => rarityWeight(name) || 99;
  const compare: Record<BrawlerSort, (a: BSBrawlerData, b: BSBrawlerData) => number> = {
    trophies: byTrophies,
    'trophies-asc': (a, b) => a.trophies - b.trophies || a.name.localeCompare(b.name),
    rarity: (a, b) => rarest(b.name) - rarest(a.name) || byTrophies(a, b),
    power: (a, b) => b.power - a.power || byTrophies(a, b),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return brawlers.filter((b) => b.name.toLowerCase().includes(q)).sort(compare[sort]);
}

export interface ProgressionFacts {
  /** Brawlers at each power level, index 0 = power 1 ... index 10 = power 11. */
  powerCounts: number[];
  /** Sum of every brawler's trophies now, and of each one's best. */
  trophies: number;
  peakTrophies: number;
  maxed: number;
  over1000: number;
}

/** Account progression from the raw brawler list (no display strings involved). */
export function progressionFacts(brawlers: readonly BSBrawlerData[]): ProgressionFacts {
  const powerCounts = Array.from({ length: 11 }, () => 0);
  for (const b of brawlers) if (b.power >= 1 && b.power <= 11) powerCounts[b.power - 1] += 1;
  return {
    powerCounts,
    trophies: brawlers.reduce((sum, b) => sum + b.trophies, 0),
    peakTrophies: brawlers.reduce((sum, b) => sum + Math.max(b.highestTrophies, b.trophies), 0),
    maxed: brawlers.filter((b) => b.power === 11).length,
    over1000: brawlers.filter((b) => b.trophies >= 1000).length,
  };
}
