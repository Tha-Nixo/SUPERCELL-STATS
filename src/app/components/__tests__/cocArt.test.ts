import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_MISSING_ART, cocItemArt, heroArt } from '../cocArt';
import type { CocArtCategory } from '../cocFacts';

const PUBLIC = path.resolve(__dirname, '../../../../public');

// Every name in the live Town Hall 18 payload (2026-10-07), by the section the mapper files it in.
const LIVE: Record<CocArtCategory, string[]> = {
  Troops: ['Barbarian', 'Archer', 'Goblin', 'Giant', 'Wall Breaker', 'Balloon', 'Wizard', 'Healer', 'Dragon', 'P.E.K.K.A', 'Minion', 'Hog Rider', 'Valkyrie', 'Golem', 'Witch', 'Lava Hound', 'Bowler', 'Baby Dragon', 'Miner', 'Yeti', 'Ice Golem', 'Electro Dragon', 'Dragon Rider', 'Headhunter', 'Electro Titan', 'Apprentice Warden', 'Ruin Witch', 'Root Rider', 'Druid', 'Thrower', 'Furnace', 'Meteor Golem', 'Sky Wagon'],
  'Super Troops': ['Super Barbarian', 'Super Archer', 'Super Wall Breaker', 'Super Giant', 'Sneaky Goblin', 'Super Miner', 'Rocket Balloon', 'Inferno Dragon', 'Super Valkyrie', 'Super Witch', 'Ice Hound', 'Super Bowler', 'Super Dragon', 'Super Wizard', 'Super Minion', 'Super Hog Rider', 'Super Yeti'],
  Spells: ['Lightning Spell', 'Healing Spell', 'Rage Spell', 'Jump Spell', 'Freeze Spell', 'Poison Spell', 'Earthquake Spell', 'Haste Spell', 'Clone Spell', 'Skeleton Spell', 'Bat Spell', 'Invisibility Spell', 'Recall Spell', 'Overgrowth Spell', 'Revive Spell', 'Ice Block Spell', 'Totem Spell', 'Angry Spell'],
  'Siege Machines': ['Wall Wrecker', 'Battle Blimp', 'Stone Slammer', 'Siege Barracks', 'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Troop Launcher'],
  'Hero Pets': ['L.A.S.S.I', 'Mighty Yak', 'Electro Owl', 'Unicorn', 'Phoenix', 'Poison Lizard', 'Diggy', 'Frosty', 'Spirit Fox', 'Angry Jelly', 'Sneezy', 'Greedy Raven'],
  'Builder Base': ['Raged Barbarian', 'Sneaky Archer', 'Beta Minion', 'Boxer Giant', 'Bomber', 'Power P.E.K.K.A', 'Cannon Cart', 'Drop Ship', 'Baby Dragon', 'Night Witch', 'Hog Glider', 'Electrofire Wizard'],
};

describe('cocItemArt', () => {
  it('finds local art for every live item except the known gaps', () => {
    const missing: string[] = [];
    for (const [category, names] of Object.entries(LIVE) as Array<[CocArtCategory, string[]]>) {
      for (const name of names) {
        const art = cocItemArt(name, category);
        if (!art) missing.push(name);
        else expect(existsSync(path.join(PUBLIC, art)), art).toBe(true);
      }
    }
    expect(missing).toEqual([...KNOWN_MISSING_ART]);
  });
  it('returns nothing for a name it does not know, so the tile shows its icon', () => {
    expect(cocItemArt('Totally New Troop', 'Troops')).toBeUndefined();
  });
});

describe('heroArt', () => {
  it('has art on disk for all eight heroes', () => {
    for (const name of ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Dragon Duke', 'Battle Machine', 'Battle Copter']) {
      const art = heroArt(name);
      expect(art, name).toBeDefined();
      expect(existsSync(path.join(PUBLIC, art!)), art).toBe(true);
    }
  });
});
