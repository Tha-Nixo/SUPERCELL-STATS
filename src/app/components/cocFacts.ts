import type { CoCAchievement, CoCHeroData, CoCHeroEquipment, CoCTroopData, GameVisuals } from '../data/mockStats';
import { sentenceCase } from '../ui/text';

/** Everything the Clash of Clans mapper puts in gameVisuals.coc. */
export type CoCVisuals = NonNullable<GameVisuals['coc']>;

/** A hero, troop, spell, pet or piece of equipment. */
export interface Leveled {
  level: number;
  maxLevel: number;
}

/**
 * Level progress. Level 0 means not unlocked: the mapper adds missing heroes,
 * pets and siege machines with level 0 and a guessed max, so no max is shown for them.
 */
export function levelFacts(item: Leveled): { locked: boolean; maxed: boolean; hasMax: boolean; pct: number } {
  // `!(x > 0)` also catches undefined and NaN, which `x <= 0` lets through.
  const locked = !(item.level > 0);
  const hasMax = item.maxLevel > 0;
  const maxed = !locked && hasMax && item.level >= item.maxLevel;
  const pct = locked || !hasMax ? 0 : Math.min(100, Math.round((item.level / item.maxLevel) * 100));
  return { locked, maxed, hasMax, pct };
}

/** The printed and spoken level; with no usable max (missing or 0) only the level is printed. */
export function levelText(item: Leveled): { visible: string; spoken: string } {
  if (!(item.maxLevel > 0)) return { visible: `${item.level}`, spoken: `Level ${item.level}` };
  return { visible: `${item.level} / ${item.maxLevel}`, spoken: `Level ${item.level} of ${item.maxLevel}` };
}

const ROLES: Record<string, string> = { leader: 'Leader', coLeader: 'Co-leader', admin: 'Elder', member: 'Member' };

/** The API's clan role id in the game's words ('admin' is an Elder in the game). */
export function roleLabel(role: string | undefined): string | undefined {
  if (!role) return undefined;
  return ROLES[role] ?? sentenceCase(role);
}

/** Folder families of the local art (cocArt.ts). */
export type CocArtCategory = 'Troops' | 'Super Troops' | 'Spells' | 'Siege Machines' | 'Hero Pets' | 'Builder Base';
export type ArmyKind = 'troops' | 'superTroops' | 'spells' | 'siegeMachines' | 'pets' | 'builderBaseTroops';

/** Army tab sections, home village first. */
export const ARMY_SECTIONS: ReadonlyArray<{ kind: ArmyKind; title: string; category: CocArtCategory }> = [
  { kind: 'troops', title: 'Troops', category: 'Troops' },
  { kind: 'superTroops', title: 'Super troops', category: 'Super Troops' },
  { kind: 'spells', title: 'Spells', category: 'Spells' },
  { kind: 'siegeMachines', title: 'Siege machines', category: 'Siege Machines' },
  { kind: 'pets', title: 'Pets', category: 'Hero Pets' },
  { kind: 'builderBaseTroops', title: 'Builder base troops', category: 'Builder Base' },
];

export function sectionFacts(items: readonly CoCTroopData[]): { total: number; unlocked: number; maxed: number; boosted: number } {
  let unlocked = 0;
  let maxed = 0;
  let boosted = 0;
  for (const item of items) {
    const f = levelFacts(item);
    if (!f.locked) unlocked++;
    if (f.maxed) maxed++;
    if (item.active) boosted++;
  }
  return { total: items.length, unlocked, maxed, boosted };
}

const BUILDER_HEROES = new Set(['BM', 'BC']);

/** Home village heroes and builder base heroes (Battle Machine, Battle Copter), each in API order. */
export function splitHeroes(heroes: readonly CoCHeroData[]): { home: CoCHeroData[]; builder: CoCHeroData[] } {
  return {
    home: heroes.filter((h) => !BUILDER_HEROES.has(h.shortName)),
    builder: heroes.filter((h) => BUILDER_HEROES.has(h.shortName)),
  };
}

export interface EquipmentEntry extends CoCHeroEquipment {
  /** Worn by a hero right now (the owned list itself does not say). */
  equipped: boolean;
}

/** Owned equipment, equipped pieces first, API order otherwise. */
export function equipmentList(heroes: readonly CoCHeroData[], owned: readonly CoCHeroEquipment[]): EquipmentEntry[] {
  const worn = new Set(heroes.flatMap((h) => (h.equipment ?? []).map((e) => e.name)));
  const list = owned.map((e) => ({ ...e, equipped: worn.has(e.name) }));
  return [...list.filter((e) => e.equipped), ...list.filter((e) => !e.equipped)];
}

/** One rule for the tile and the filter: three stars, the API's "Completed!", or the target reached. */
export function isAchievementDone(a: CoCAchievement): boolean {
  return a.stars >= 3 || a.completionInfo === 'Completed!' || (a.target > 0 && a.value >= a.target);
}

/** Completed achievements without stars (account safety) show no star row. */
export function showStars(a: CoCAchievement): boolean {
  return a.stars > 0 || !isAchievementDone(a);
}

/**
 * The star row of an achievement: hidden for completed ones without stars; a completed one shows only
 * the stars it earned and says "N star(s)", an open one shows three slots and says "N of 3 stars".
 */
export function starsFacts(a: CoCAchievement): { show: boolean; earnedOnly: boolean; spoken: string } {
  const earnedOnly = isAchievementDone(a);
  return {
    show: showStars(a),
    earnedOnly,
    spoken: earnedOnly ? `${a.stars} ${a.stars === 1 ? 'star' : 'stars'}` : `${a.stars} of 3 stars`,
  };
}

/** '2000000000' -> '2,000,000,000' inside API text. The API sends ASCII digits; four or more get separators. */
export function groupDigits(text: string): string {
  // String-based: no Number conversion, so long runs and leading zeros survive untouched.
  return text.replace(/(\d+)(\.\d+)?/g, (match, int: string, frac = '') =>
    int.length >= 4 ? int.replace(/\B(?=(\d{3})+$)/g, ',') + frac : match);
}

export type AchievementVillage = 'all' | 'home' | 'builderBase' | 'clanCapital';
export type AchievementStatus = 'all' | 'done' | 'open';

export const ACHIEVEMENT_VILLAGES: ReadonlyArray<readonly [AchievementVillage, string]> = [
  ['all', 'All'],
  ['home', 'Home village'],
  ['builderBase', 'Builder base'],
  ['clanCapital', 'Clan capital'],
];
export const ACHIEVEMENT_STATUSES: ReadonlyArray<readonly [AchievementStatus, string]> = [
  ['all', 'All'],
  ['done', 'Completed'],
  ['open', 'In progress'],
];

const inVillage = (a: CoCAchievement, v: AchievementVillage) => v === 'all' || a.village === v;
const inStatus = (a: CoCAchievement, s: AchievementStatus) => s === 'all' || (s === 'done') === isAchievementDone(a);

/**
 * The achievements a filter pair shows, plus the count each option would show
 * with the other filter kept, the completed count and the stars earned (whole list).
 */
export function achievementView(list: readonly CoCAchievement[], village: AchievementVillage, status: AchievementStatus) {
  const villageCounts = Object.fromEntries(
    ACHIEVEMENT_VILLAGES.map(([v]) => [v, list.filter((a) => inVillage(a, v) && inStatus(a, status)).length]),
  ) as Record<AchievementVillage, number>;
  const statusCounts = Object.fromEntries(
    ACHIEVEMENT_STATUSES.map(([s]) => [s, list.filter((a) => inVillage(a, village) && inStatus(a, s)).length]),
  ) as Record<AchievementStatus, number>;
  return {
    shown: list.filter((a) => inVillage(a, village) && inStatus(a, status)),
    villageCounts,
    statusCounts,
    done: list.filter(isAchievementDone).length,
    stars: list.reduce((sum, a) => sum + a.stars, 0),
  };
}
