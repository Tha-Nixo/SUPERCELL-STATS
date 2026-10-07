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
 * not send rarity). A brawler newer than the table ranks as 0, after Common.
 */
export function rarityWeight(name: string): number {
  return RARITY_WEIGHT[brawlerRarityMap[name.toUpperCase().replace(/ /g, '-')] ?? ''] ?? 0;
}

/** The brawlers whose name contains `query` (any case), in `sort` order; ties by trophies, then name. */
export function brawlerList(brawlers: readonly BSBrawlerData[], query: string, sort: BrawlerSort): BSBrawlerData[] {
  const q = query.trim().toLowerCase();
  const byTrophies = (a: BSBrawlerData, b: BSBrawlerData) => b.trophies - a.trophies || a.name.localeCompare(b.name);
  const compare: Record<BrawlerSort, (a: BSBrawlerData, b: BSBrawlerData) => number> = {
    trophies: byTrophies,
    'trophies-asc': (a, b) => a.trophies - b.trophies || a.name.localeCompare(b.name),
    rarity: (a, b) => rarityWeight(b.name) - rarityWeight(a.name) || byTrophies(a, b),
    power: (a, b) => b.power - a.power || byTrophies(a, b),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  return brawlers.filter((b) => b.name.toLowerCase().includes(q)).sort(compare[sort]);
}
