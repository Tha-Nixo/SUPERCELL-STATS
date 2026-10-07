/**
 * Synthetic Supercell API payloads for e2e tests and screenshots. Invented
 * players: never put a real player's tag or data in this file (real tags only
 * reach the tests through E2E_CR_TAG / E2E_BS_TAG / E2E_COC_TAG).
 */
export const FIXTURE_TAG = 'PYLQGRJC';

const card = (id: number, name: string, rarity: string, level: number, maxLevel: number, elixirCost: number) => ({
  id, name, rarity, level, maxLevel, elixirCost, count: 120, iconUrls: { medium: `https://api-assets.clashroyale.com/cards/300/${id}.png` },
});
const deck = [
  { ...card(26000000, 'Knight', 'common', 14, 16, 3), evolutionLevel: 1, starLevel: 2, iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/26000000.png', evolutionMedium: 'https://api-assets.clashroyale.com/cardevolutions/300/26000000.png' } },
  card(26000001, 'Archers', 'common', 14, 16, 3),
  card(26000010, 'Skeleton Army', 'epic', 10, 11, 3),
  card(26000021, 'Hog Rider', 'rare', 12, 14, 4),
  card(28000000, 'Fireball', 'rare', 12, 14, 4),
  card(28000001, 'Arrows', 'common', 14, 16, 3),
  card(27000000, 'Cannon', 'common', 13, 16, 3),
  card(26000035, 'Ice Golem', 'rare', 12, 14, 2),
];

const crBattle = (minutesAgo: number, my: number, opp: number, trophyChange?: number, type = 'PvP') => ({
  type,
  battleTime: new Date(Date.UTC(2026, 9, 6, 10, 0) - minutesAgo * 60_000).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '.000Z'),
  gameMode: { id: 72000006, name: 'Ladder' },
  team: [{ tag: `#${FIXTURE_TAG}`, name: 'Vela Storm', crowns: my, trophyChange }],
  opponent: [{ tag: '#2Y0Y', name: 'Opponent', crowns: opp }],
});

const towerTroop = (id: number, name: string, rarity: string, level: number) => ({
  id, name, rarity, level, maxLevel: 16, iconUrls: { medium: `https://api-assets.clashroyale.com/cards/300/${id}.png` },
});
const towerTroops = [towerTroop(159000000, 'Tower Princess', 'common', 16), towerTroop(159000001, 'Cannoneer', 'epic', 11), towerTroop(159000002, 'Dagger Duchess', 'legendary', 8)];
export const crPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Vela Storm',
  expLevel: 54,
  trophies: 9123,
  bestTrophies: 9301,
  wins: 4210,
  losses: 3388,
  threeCrownWins: 1530,
  arena: { id: 54000057, name: 'Legendary Arena' },
  role: 'elder',
  cards: deck,
  currentDeck: deck,
  supportCards: towerTroops,
  currentDeckSupportCards: [towerTroops[1]],
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', badgeUrl: 'https://api-assets.clashroyale.com/badges/200/16000000.png' },
  totalDonations: 2048,
  warDayWins: 12,
  leagueStatistics: { currentSeason: { trophies: 9123 }, bestSeason: { id: '2026-08', trophies: 9288 } },
  currentPathOfLegendSeasonResult: { leagueNumber: 7, trophies: 1968, rank: 1520 },
  bestPathOfLegendSeasonResult: { leagueNumber: 10, trophies: 3371, rank: 37 },
  legacyTrophyRoadHighScore: 8063,
  badges: [
    { name: 'Classic12Wins', level: 3, maxLevel: 8, progress: 30, target: 50, iconUrls: { large: 'https://api-assets.clashroyale.com/badges/1.png' } },
    { name: 'YearsPlayed', level: 9, maxLevel: 10, progress: 3400, target: 3650, iconUrls: { large: 'https://api-assets.clashroyale.com/badges/2.png' } },
  ],
  achievements: [
    { name: 'Team Player', stars: 3, value: 1, target: 1, info: 'Join a clan' },
    { name: 'Gatherer', stars: 2, value: 1800, target: 3000, info: 'Collect 3000 cards' },
  ],
  currentFavouriteCard: { id: 26000021, name: 'Hog Rider', rarity: 'rare', maxLevel: 14, elixirCost: 4, iconUrls: { medium: 'https://api-assets.clashroyale.com/cards/300/26000021.png' } },
};
// Newest first. 9 battles: 5 wins, 3 losses, 1 draw; Ladder 4, Path of Legend 3,
// River Race 1 (a win), Special event 1 (type "unknown", a loss).
export const crBattlelog = [
  crBattle(5, 3, 1, 31),
  crBattle(30, 0, 1, -28),
  crBattle(60, 1, 1, 0),
  crBattle(90, 2, 0, 30),
  crBattle(120, 1, 0, 29, 'pathOfLegend'),
  crBattle(150, 0, 2, undefined, 'pathOfLegend'),
  crBattle(180, 2, 1, undefined, 'riverRacePvP'),
  crBattle(210, 0, 3, undefined, 'unknown'),
  crBattle(240, 3, 0, undefined, 'pathOfLegend'),
];

const brawler = (id: number, name: string, power: number, trophies: number, highestTrophies: number, rank: number, extra: Record<string, unknown> = {}) => ({
  id, name, power, rank, trophies, highestTrophies, prestigeLevel: Math.floor(trophies / 1000), currentWinStreak: 0, maxWinStreak: 0,
  gadgets: [], starPowers: [], gears: [], hyperCharges: [], buffies: { gadget: false, starPower: false, hyperCharge: false }, ...extra,
});

// Six brawlers covering every brawler-card branch: hypercharge, win streak, all three
// kinds of equipment, none at all, a renamed brawler (GLOWBERT -> Glowy) and names
// with a digit, a dot and a space.
export const bsPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Kitebreaker',
  nameColor: '0xffffffff',
  icon: { id: 28000000 },
  trophies: 41234,
  highestTrophies: 42010,
  expLevel: 211,
  expPoints: 250000,
  totalPrestigeLevel: 14,
  '3vs3Victories': 18234,
  soloVictories: 1022,
  duoVictories: 2210,
  bestRoboRumbleTime: 125,
  rankedRankName: 'GOLD II',
  rankedElo: 2196,
  highestAllTimeRankedRankName: 'MASTERS III',
  club: { tag: '#2Y0Y', name: 'Lantern<c4>Watch</c>' },
  brawlers: [
    brawler(16000000, 'SHELLY', 11, 1210, 1250, 5, {
      currentWinStreak: 4,
      maxWinStreak: 12,
      skin: { id: 29000722, name: 'HOOT HOOT SHELLY' },
      gadgets: [{ id: 23000255, name: 'FAST FORWARD' }, { id: 23000288, name: 'CLAY PIGEONS' }],
      starPowers: [{ id: 23000076, name: 'SHELL SHOCK' }, { id: 23000135, name: 'BAND-AID' }],
      gears: [{ id: 62000002, name: 'DAMAGE', level: 3 }, { id: 62000004, name: 'SHIELD', level: 3 }],
      hyperCharges: [{ id: 23000613, name: 'DOUBLE BARREL' }],
      buffies: { gadget: true, starPower: false, hyperCharge: true },
    }),
    brawler(16000027, '8-BIT', 11, 980, 1000, 4, {
      gadgets: [{ id: 23000273, name: 'CHEAT CARTRIDGE' }],
      starPowers: [{ id: 23000123, name: 'BOOSTED BOOSTER' }],
      gears: [{ id: 62000000, name: 'SPEED', level: 3 }, { id: 62000001, name: 'VISION', level: 3 }, { id: 62000003, name: 'HEALTH', level: 3 }],
    }),
    brawler(16000001, 'COLT', 9, 750, 800, 4, {
      gadgets: [{ id: 23000272, name: 'SPEEDLOADER' }],
      starPowers: [{ id: 23000077, name: 'SLICK BOOTS' }],
    }),
    brawler(16000032, 'MR. P', 7, 420, 430, 2),
    brawler(16000010, 'EL PRIMO', 3, 120, 150, 1),
    brawler(16000083, 'GLOWBERT', 1, 0, 0, 1),
  ],
};

const bsBattle = (battleTime: string, mode: string, map: string, battle: Record<string, unknown>) => ({
  battleTime, event: { id: 15000001, mode, map }, battle: { mode, type: 'ranked', ...battle },
});
const soloPlayers = Array.from({ length: 10 }, (_, i) => ({ tag: i === 0 ? `#${FIXTURE_TAG}` : `#2PP${i}`, name: `P${i}`, brawler: { id: 16000000, name: 'SHELLY', power: 11, trophies: 1200 } }));
const duoTeams = Array.from({ length: 5 }, (_, t) => soloPlayers.slice(t * 2, t * 2 + 2));

// Newest first. 9 battles: 5 wins, 3 losses, 1 draw. Gem Grab 2 (a win, a draw),
// Brawl Ball 2 (a loss, a friendly win without trophies), Solo Showdown 3 (placed 1st, 7th, 3rd),
// Duo Showdown 1 (placed 2nd), Knockout 1 (a loss). Showdown reports a placement, never a result.
export const bsBattlelog = {
  items: [
    bsBattle('20261006T095500.000Z', 'gemGrab', 'Hard Rock Mine', { result: 'victory', duration: 121, trophyChange: 8 }),
    bsBattle('20261006T093000.000Z', 'brawlBall', 'Backyard Bowl', { result: 'defeat', duration: 140, trophyChange: -5 }),
    bsBattle('20261006T090000.000Z', 'soloShowdown', 'Acid Lakes', { rank: 1, trophyChange: 12, players: soloPlayers }),
    bsBattle('20261006T083000.000Z', 'soloShowdown', 'Acid Lakes', { rank: 7, trophyChange: -6, players: soloPlayers }),
    bsBattle('20261006T080000.000Z', 'duoShowdown', 'Royal Runway', { rank: 2, trophyChange: 7, teams: duoTeams }),
    bsBattle('20261006T073000.000Z', 'gemGrab', 'Crystal Arcade', { result: 'draw', duration: 150, trophyChange: 0 }),
    bsBattle('20261006T070000.000Z', 'brawlBall', 'Super Beach', { type: 'friendly', result: 'victory', duration: 95 }),
    bsBattle('20261006T063000.000Z', 'knockout', 'Belle\'s Rock', { result: 'defeat', duration: 88, trophyChange: -6 }),
    bsBattle('20261006T060000.000Z', 'soloShowdown', 'Skull Creek', { rank: 3, trophyChange: 2, players: soloPlayers }),
  ],
};

// GET /api/brawl-stars/clubs/{tag}. Club names and descriptions carry in-game colour
// tags (<c4>...</c>), as on production.
export const bsClub = {
  tag: '#2Y0Y',
  name: 'Lantern<c4>Watch</c>',
  description: 'Friendly club, <c2>active</c> daily.\nPush events together.',
  type: 'inviteOnly',
  badgeId: 8000023,
  requiredTrophies: 30000,
  trophies: 161734,
  members: [
    { tag: '#9QRL0', name: 'Ash Vale', nameColor: '0xffff8afb', role: 'president', trophies: 52000, icon: { id: 28000000 } },
    { tag: `#${FIXTURE_TAG}`, name: 'Kitebreaker', nameColor: '0xffffffff', role: 'vicePresident', trophies: 41234, icon: { id: 28000000 } },
    { tag: '#8LQ2', name: 'Moss', nameColor: '0xff1ba5f5', role: 'senior', trophies: 38000, icon: { id: 28000000 } },
    { tag: '#2PPY', name: 'Rin', nameColor: '0xffffffff', role: 'member', trophies: 30500, icon: { id: 28000000 } },
  ],
};

const cocItem = (name: string, level: number, maxLevel: number, village = 'home', extra: Record<string, unknown> = {}) => ({ name, level, maxLevel, village, ...extra });
const cocAchievement = (name: string, stars: number, value: number, target: number, info: string, completionInfo: string | null, village = 'home') => ({ name, stars, value, target, info, completionInfo, village });

// GET /api/clash-of-clans/players/{tag}, shaped like the live payload. Covers: a maxed
// hero and a hero below max, heroes with two, one and no equipment, three home heroes
// missing (the mapper adds them at level 0 = not unlocked), a builder base hero,
// equipment owned but not equipped, every troop kind (a maxed troop, Meteor Golem,
// Super Yeti and a boosted super troop, siege machines, pets, a builder base troop),
// art that does not exist locally (Sky Wagon, Angry Spell) and achievements done,
// in progress, done by value, without stars, in all three villages.
export const cocPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Harrow Keep',
  townHallLevel: 15,
  builderHallLevel: 10,
  expLevel: 210,
  trophies: 5012,
  bestTrophies: 5340,
  warStars: 1450,
  attackWins: 88,
  defenseWins: 4,
  builderBaseTrophies: 3120,
  bestBuilderBaseTrophies: 3333,
  donations: 1200,
  donationsReceived: 900,
  clanCapitalContributions: 1234567,
  role: 'coLeader',
  league: { id: 29000022, name: 'Legend League', iconUrls: { medium: 'https://api-assets.clashofclans.com/leagues/288/legend.png' } },
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', clanLevel: 18, badgeUrls: { medium: 'https://api-assets.clashofclans.com/badges/200/lantern.png' } },
  legendStatistics: {
    legendTrophies: 2210,
    currentSeason: { rank: 1412, trophies: 5012 },
    bestSeason: { id: '2026-08', rank: 830, trophies: 5560 },
  },
  heroes: [
    cocItem('Barbarian King', 85, 95, 'home', { equipment: [cocItem('Barbarian Puppet', 18, 18), cocItem('Rage Vial', 15, 18)] }),
    cocItem('Archer Queen', 95, 95, 'home', { equipment: [cocItem('Archer Puppet', 18, 18), cocItem('Invisibility Vial', 18, 18)] }),
    cocItem('Grand Warden', 60, 70, 'home', { equipment: [cocItem('Eternal Tome', 12, 18)] }),
    cocItem('Battle Machine', 30, 35, 'builderBase'),
  ],
  heroEquipment: [
    cocItem('Barbarian Puppet', 18, 18),
    cocItem('Rage Vial', 15, 18),
    cocItem('Archer Puppet', 18, 18),
    cocItem('Invisibility Vial', 18, 18),
    cocItem('Eternal Tome', 12, 18),
    cocItem('Giant Arrow', 9, 18),
    cocItem('Earthquake Boots', 1, 18),
    cocItem('Healer Puppet', 18, 18),
  ],
  troops: [
    cocItem('Barbarian', 11, 12),
    cocItem('Archer', 12, 12),
    cocItem('Giant', 10, 12),
    cocItem('Meteor Golem', 1, 3),
    cocItem('Sky Wagon', 1, 4),
    cocItem('Super Barbarian', 1, 5),
    cocItem('Sneaky Goblin', 1, 3, 'home', { superTroopIsActive: true }),
    cocItem('Super Yeti', 1, 4),
    cocItem('Wall Wrecker', 4, 5),
    cocItem('Battle Blimp', 4, 4),
    cocItem('L.A.S.S.I', 10, 10),
    cocItem('Mighty Yak', 7, 10),
    cocItem('Raged Barbarian', 18, 20, 'builderBase'),
  ],
  spells: [cocItem('Lightning Spell', 10, 11), cocItem('Healing Spell', 9, 10), cocItem('Angry Spell', 2, 4)],
  achievements: [
    cocAchievement('Conqueror', 3, 8123, 5000, 'Win 5000 multiplayer battles', 'Total multiplayer battles won: 8123'),
    cocAchievement('Unbreakable', 2, 2100, 5000, 'Successfully defend against 5000 attacks', null),
    cocAchievement('Sweet Victory!', 3, 5340, 1250, 'Achieve a total of 1250 trophies in Multiplayer battles', 'Trophy record: 5340'),
    cocAchievement('Gold Grab', 2, 41000000, 100000000, 'Steal 100000000 gold', null),
    cocAchievement('Dragon Slayer', 1, 5, 1, 'Slay the Giant Dragon', null),
    cocAchievement('Keep Your Account Safe!', 0, 0, 1, 'Connect your account to Supercell ID for safe keeping.', 'Completed!'),
    cocAchievement('Master Engineering', 3, 10, 8, 'Upgrade a Builder Hall to level 8', 'Current Builder Hall level: 10', 'builderBase'),
    cocAchievement('Most Valuable Clanmate', 1, 1234567, 2000000, 'Contribute 2000000 Capital Gold', null, 'clanCapital'),
  ],
};

// A small Town Hall 9 account, merged over cocPlayer with mockApi's patch: one hero,
// no equipment, no siege machine or pet unlocked, no league, no legend statistics.
export const cocLowTownHall = {
  townHallLevel: 9,
  builderHallLevel: 0,
  league: undefined,
  legendStatistics: undefined,
  heroes: [cocItem('Barbarian King', 20, 40)],
  heroEquipment: [],
  troops: [cocItem('Barbarian', 6, 12), cocItem('Archer', 6, 12)],
  spells: [cocItem('Lightning Spell', 5, 11)],
};
