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
  crBattle(120, 1, 0, undefined, 'pathOfLegend'),
  crBattle(150, 0, 2, undefined, 'pathOfLegend'),
  crBattle(180, 2, 1, undefined, 'riverRacePvP'),
  crBattle(210, 0, 3, undefined, 'unknown'),
  crBattle(240, 3, 0, undefined, 'pathOfLegend'),
];

export const bsPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Kitebreaker',
  nameColor: '0xffffffff',
  icon: { id: 28000000 },
  trophies: 41234,
  highestTrophies: 42010,
  expLevel: 211,
  expPoints: 250000,
  '3vs3Victories': 18234,
  soloVictories: 1022,
  duoVictories: 2210,
  brawlers: [
    { id: 16000000, name: 'SHELLY', power: 11, rank: 5, trophies: 1000, highestTrophies: 1020, gadgets: [{ id: 23000255, name: 'FAST FORWARD' }], starPowers: [], gears: [] },
    { id: 16000001, name: 'COLT', power: 9, rank: 4, trophies: 750, highestTrophies: 800, gadgets: [], starPowers: [], gears: [] },
  ],
};
export const bsBattlelog = {
  items: [
    { battleTime: '20261006T095500.000Z', event: { id: 15000001, mode: 'gemGrab', map: 'Hard Rock Mine' }, battle: { mode: 'gemGrab', type: 'ranked', result: 'victory', duration: 121, trophyChange: 8 } },
    { battleTime: '20261006T093000.000Z', event: { id: 15000002, mode: 'brawlBall', map: 'Backyard Bowl' }, battle: { mode: 'brawlBall', type: 'ranked', result: 'defeat', duration: 140, trophyChange: -5 } },
  ],
};

export const cocPlayer = {
  tag: `#${FIXTURE_TAG}`,
  name: 'Harrow Keep',
  townHallLevel: 15,
  builderHallLevel: 10,
  expLevel: 210,
  trophies: 5012,
  bestTrophies: 5340,
  warStars: 1450,
  donations: 1200,
  donationsReceived: 900,
  league: { name: 'Legend League' },
  clan: { tag: '#2Y0Y', name: 'Lantern Watch', clanLevel: 18 },
  role: 'coLeader',
  heroes: [
    { name: 'Barbarian King', level: 85, maxLevel: 95, village: 'home' },
    { name: 'Archer Queen', level: 86, maxLevel: 95, village: 'home' },
  ],
  troops: [{ name: 'Barbarian', level: 11, maxLevel: 12, village: 'home' }],
  spells: [{ name: 'Lightning Spell', level: 10, maxLevel: 11, village: 'home' }],
  achievements: [
    { name: 'Conqueror', stars: 3, value: 8123, target: 5000, info: 'Win 5000 multiplayer battles', village: 'home' },
    { name: 'Unbreakable', stars: 3, value: 2100, target: 5000, info: 'Successfully defend against 5000 attacks', village: 'home' },
  ],
};
