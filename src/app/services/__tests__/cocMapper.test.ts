import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapClashOfClansPlayer } from '../supercellService';

// Shaped like the live /players/{tag} payload (fields trimmed); invented tag.
const item = (name: string, level: number, maxLevel: number, village = 'home', extra: Record<string, unknown> = {}) => ({ name, level, maxLevel, village, ...extra });
const live = {
  tag: '#PYLQGRJC',
  name: 'Harrow Keep',
  townHallLevel: 18,
  expLevel: 300,
  trophies: 5000,
  bestTrophies: 6500,
  warStars: 8000,
  builderHallLevel: 10,
  donations: 200,
  donationsReceived: 120,
  role: 'coLeader',
  clan: { tag: '#2PP0LQ', name: 'Lantern Watch', clanLevel: 37, badgeUrls: { medium: 'https://api-assets.clashofclans.com/badges/200/x.png' } },
  legendStatistics: { legendTrophies: 4200, currentSeason: { rank: 150, trophies: 5000 }, bestBuilderBaseSeason: { id: '2023-09', rank: 3200, trophies: 5500 } },
  heroes: [item('Barbarian King', 110, 110)],
  troops: [
    item('Barbarian', 13, 13),
    item('Meteor Golem', 3, 3),
    item('Super Yeti', 1, 8),
    item('Super Bowler', 1, 10, 'home', { superTroopIsActive: true }),
    item('Super Archer', 1, 10),
    item('Wall Wrecker', 6, 6),
    item('L.A.S.S.I', 15, 15),
    item('Raged Barbarian', 20, 20, 'builderBase'),
  ],
  spells: [item('Lightning Spell', 13, 13)],
  achievements: [
    { name: 'Conqueror', stars: 3, value: 35000, target: 5000, info: 'Win 5000 multiplayer battles', completionInfo: 'Total multiplayer battles won: 35000', village: 'home' },
    { name: 'Unbreakable', stars: 3, value: 1800, target: 500, info: 'Successfully defend against 500 attacks', completionInfo: 'Total defenses won: 1800', village: 'home' },
  ],
};

describe('mapClashOfClansPlayer', () => {
  const coc = () => mapClashOfClansPlayer(live).gameVisuals!.coc!;

  it('uses the experience level as the player level, not the Town Hall', () => {
    const stats = mapClashOfClansPlayer(live);
    expect(stats.level).toBe(300);
    expect(coc().expLevel).toBe(300);
    expect(coc().townHallLevel).toBe(18);
  });

  it('exposes the raw numbers the panels print, so nothing parses formatted strings', () => {
    expect(coc()).toMatchObject({
      bestTrophies: 6500,
      donations: 200,
      donationsReceived: 120,
      lifetimeAttackWins: 35000,
      lifetimeDefenseWins: 1800,
      clanTag: '#2PP0LQ',
      warStars: 8000,
    });
  });

  it('keeps Meteor Golem with the troops and files Super Yeti as a super troop', () => {
    expect(coc().troops!.map((t) => t.name)).toEqual(['Barbarian', 'Meteor Golem']);
    expect(coc().superTroops!.map((t) => t.name)).toEqual(['Super Yeti', 'Super Bowler', 'Super Archer']);
  });

  it('keeps which super troop is boosted right now', () => {
    expect(coc().superTroops!.find((t) => t.name === 'Super Bowler')?.active).toBe(true);
    expect(coc().superTroops!.find((t) => t.name === 'Super Archer')?.active).toBe(false);
  });

  it('passes the legend statistics through, current season rank included', () => {
    expect(coc().legendStatistics?.currentSeason).toEqual({ rank: 150, trophies: 5000 });
    expect(coc().legendStatistics?.bestBuilderBaseSeason).toEqual({ id: '2023-09', rank: 3200, trophies: 5500 });
  });

  it('falls back to the large league icon when the tier has no medium one', () => {
    const tierOnly = { ...live, league: undefined, leagueTier: { name: 'Legend League', iconUrls: { small: 'https://x/s.png', large: 'https://x/l.png' } } };
    expect(mapClashOfClansPlayer(tierOnly).gameVisuals!.coc!.leagueBadgeUrl).toBe('https://x/l.png');
    const smallOnly = { ...live, league: { name: 'Gold', iconUrls: { small: 'https://x/s2.png' } }, leagueTier: undefined };
    expect(mapClashOfClansPlayer(smallOnly).gameVisuals!.coc!.leagueBadgeUrl).toBe('https://x/s2.png');
  });

  it('maps a missing experience level to 0, the value the summary treats as "no level"', () => {
    expect(mapClashOfClansPlayer({ ...live, expLevel: undefined }).level).toBe(0);
  });

  it('has no clan tag for a player outside a clan', () => {
    const stats = mapClashOfClansPlayer({ ...live, clan: undefined, role: undefined });
    expect(stats.gameVisuals!.coc!.clanTag).toBeUndefined();
  });

  it.each(['ar-EG', 'fa-IR'])('keeps raw numbers when the display locale uses non-Latin digits (%s)', (locale) => {
    const original = Number.prototype.toLocaleString;
    vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (this: number) {
      return original.call(this, locale);
    });
    const visuals = mapClashOfClansPlayer(live).gameVisuals!.coc!;
    expect(visuals.donations).toBe(200);
    expect(visuals.bestTrophies).toBe(6500);
    expect(visuals.lifetimeAttackWins).toBe(35000);
    expect(visuals.lifetimeDefenseWins).toBe(1800);
    expect(typeof visuals.expLevel).toBe('number');
  });

  afterEach(() => vi.restoreAllMocks());
});
