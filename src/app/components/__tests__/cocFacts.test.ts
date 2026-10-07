import { describe, expect, it } from 'vitest';
import type { CoCAchievement, CoCHeroData } from '../../data/mockStats';
import {
  ACHIEVEMENT_VILLAGES, ARMY_SECTIONS, achievementView, equipmentList, groupDigits, isAchievementDone, levelFacts, roleLabel,
  sectionFacts, showStars, splitHeroes,
} from '../cocFacts';

const ach = (name: string, stars: number, value: number, target: number, completionInfo: string | null = null, village = 'home'): CoCAchievement =>
  ({ name, stars, value, target, info: '', completionInfo, village });
const hero = (name: string, shortName: string, level: number, equipment: Array<{ name: string; level: number; maxLevel: number }> = []): CoCHeroData =>
  ({ name, shortName, level, maxLevel: 95, emoji: '', color: '', equipment: equipment.map((e) => ({ ...e, village: 'home' })) });

describe('levelFacts', () => {
  it('reads level 0 as not unlocked, with no progress', () => {
    expect(levelFacts({ level: 0, maxLevel: 10 })).toEqual({ locked: true, maxed: false, pct: 0 });
  });
  it('marks max level and rounds the share', () => {
    expect(levelFacts({ level: 12, maxLevel: 12 })).toEqual({ locked: false, maxed: true, pct: 100 });
    expect(levelFacts({ level: 85, maxLevel: 95 })).toEqual({ locked: false, maxed: false, pct: 89 });
  });
  it('survives a missing or zero max', () => {
    expect(levelFacts({ level: 3, maxLevel: 0 })).toEqual({ locked: false, maxed: false, pct: 0 });
  });
});

describe('roleLabel', () => {
  it('uses the words the game uses', () => {
    expect(roleLabel('leader')).toBe('Leader');
    expect(roleLabel('coLeader')).toBe('Co-leader');
    expect(roleLabel('admin')).toBe('Elder');
    expect(roleLabel('member')).toBe('Member');
  });
  it('falls back to sentence case for an unknown role and to nothing for none', () => {
    expect(roleLabel('newRole')).toBe('New role');
    expect(roleLabel(undefined)).toBeUndefined();
  });
});

describe('army sections', () => {
  it('lists the home village first and the builder base last', () => {
    expect(ARMY_SECTIONS.map((s) => s.title)).toEqual(['Troops', 'Super troops', 'Spells', 'Siege machines', 'Pets', 'Builder base troops']);
  });
  it('counts unlocked, maxed and boosted items', () => {
    const items = [
      { name: 'A', level: 12, maxLevel: 12 },
      { name: 'B', level: 3, maxLevel: 12 },
      { name: 'C', level: 0, maxLevel: 10 },
      { name: 'D', level: 1, maxLevel: 5, active: true },
    ];
    expect(sectionFacts(items)).toEqual({ total: 4, unlocked: 3, maxed: 1, boosted: 1 });
  });
});

describe('heroes and equipment', () => {
  it('splits builder base heroes from home village heroes', () => {
    const { home, builder } = splitHeroes([hero('Barbarian King', 'BK', 85), hero('Battle Machine', 'BM', 30), hero('Battle Copter', 'BC', 20)]);
    expect(home.map((h) => h.shortName)).toEqual(['BK']);
    expect(builder.map((h) => h.shortName)).toEqual(['BM', 'BC']);
  });
  it('marks equipped pieces and lists them first, keeping the API order otherwise', () => {
    const heroes = [hero('Barbarian King', 'BK', 85, [{ name: 'Rage Vial', level: 15, maxLevel: 18 }])];
    const owned = [
      { name: 'Giant Arrow', level: 9, maxLevel: 18, village: 'home' },
      { name: 'Rage Vial', level: 15, maxLevel: 18, village: 'home' },
      { name: 'Healer Puppet', level: 18, maxLevel: 18, village: 'home' },
    ];
    expect(equipmentList(heroes, owned).map((e) => [e.name, e.equipped])).toEqual([
      ['Rage Vial', true],
      ['Giant Arrow', false],
      ['Healer Puppet', false],
    ]);
  });
});

describe('achievements', () => {
  it('counts an achievement as done by stars, by the API text or by value, everywhere', () => {
    expect(isAchievementDone(ach('Conqueror', 3, 8123, 5000))).toBe(true);
    expect(isAchievementDone(ach('Keep Your Account Safe!', 0, 0, 1, 'Completed!'))).toBe(true);
    expect(isAchievementDone(ach('Dragon Slayer', 1, 5, 1))).toBe(true);
    expect(isAchievementDone(ach('Gold Grab', 2, 41000000, 100000000))).toBe(false);
  });
  it('hides stars only for completed achievements that have none', () => {
    expect(showStars(ach('Keep Your Account Safe!', 0, 0, 1, 'Completed!'))).toBe(false);
    expect(showStars(ach('Gold Grab', 0, 10, 100))).toBe(true);
    expect(showStars(ach('Dragon Slayer', 1, 5, 1))).toBe(true);
  });
  it('groups long ASCII numbers in API text and leaves short ones alone', () => {
    expect(groupDigits('Total Gold looted: 2000000000')).toBe('Total Gold looted: 2,000,000,000');
    expect(groupDigits('Upgrade a Builder Hall to level 8')).toBe('Upgrade a Builder Hall to level 8');
    expect(groupDigits('Win 5000 multiplayer battles')).toBe('Win 5,000 multiplayer battles');
  });
  it('groups by string, so long runs, leading zeros, signs and decimals stay exact', () => {
    expect(groupDigits('12345678901234567890')).toBe('12,345,678,901,234,567,890');
    expect(groupDigits('Code 0001234')).toBe('Code 0,001,234');
    expect(groupDigits('Lost -12345 trophies')).toBe('Lost -12,345 trophies');
    expect(groupDigits('Rate 1234.5678')).toBe('Rate 1,234.5678');
    expect(groupDigits('Win 123 battles')).toBe('Win 123 battles');
  });
  it('leaves non-Latin digits untouched', () => {
    expect(groupDigits('٢٠٠٠٠٠٠٠٠٠')).toBe('٢٠٠٠٠٠٠٠٠٠');
    expect(groupDigits('۱۲۳۴۵۶')).toBe('۱۲۳۴۵۶');
  });
  it('filters by village and status, with counts for each option of the other filter', () => {
    const list = [
      ach('A', 3, 10, 5),
      ach('B', 1, 1, 5),
      ach('C', 3, 10, 8, null, 'builderBase'),
      ach('D', 0, 0, 1, null, 'clanCapital'),
    ];
    const all = achievementView(list, 'all', 'all');
    expect(all.shown).toHaveLength(4);
    expect(all.villageCounts).toEqual({ all: 4, home: 2, builderBase: 1, clanCapital: 1 });
    expect(all.statusCounts).toEqual({ all: 4, done: 2, open: 2 });
    expect(all.done).toBe(2);
    expect(all.stars).toBe(7);

    const homeOpen = achievementView(list, 'home', 'open');
    expect(homeOpen.shown.map((a) => a.name)).toEqual(['B']);
    // Village counts follow the chosen status, status counts follow the chosen village.
    expect(homeOpen.villageCounts).toEqual({ all: 2, home: 1, builderBase: 0, clanCapital: 1 });
    expect(homeOpen.statusCounts).toEqual({ all: 2, done: 1, open: 1 });
  });
  it('offers the three villages the API uses', () => {
    expect(ACHIEVEMENT_VILLAGES.map(([id]) => id)).toEqual(['all', 'home', 'builderBase', 'clanCapital']);
  });
});
