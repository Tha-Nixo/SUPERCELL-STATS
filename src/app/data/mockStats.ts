// Mock player stats generator
export interface StatLabels {
  stat1Title?: string;
  stat1Sub?: string;
  stat2Title?: string;
  stat2Value?: string;
  stat2Sub?: string;
  stat3Title?: string;
  stat3Value?: string;
  stat3Sub?: string;
  stat4Title?: string;
  stat4Value?: string;
  stat4Sub?: string;
}

// ── Game-Specific Visual Data ─────────────────────────────────────────────────

export interface CRCardData {
  id: number;
  name: string;
  level: number;
  maxLevel: number;
  count: number;
  maxCount: number;
  iconUrl: string;
  rarity?: string;
  elixirCost?: number;
  starLevel?: number;
  evolutionLevel?: number;
  maxEvolutionLevel?: number;
  evolutionIconUrl?: string; // from iconUrls.evolutionMedium or heroMedium
}

export interface CRBadge {
  name: string;
  level: number;
  maxLevel: number;
  progress: number;
  target: number;
  iconUrl: string;
}

export interface CRAchievement {
  name: string;
  stars: number;
  value: number;
  target: number;
  info: string;
  completionInfo: string | null;
}

export interface CRSeasonStats {
  id?: string;
  rank?: number;
  trophies: number;
  bestTrophies?: number;
}

export interface CRTowerTroop {
  id: number;
  name: string;
  level: number;
  maxLevel: number;
  rarity: string;
  iconUrl: string;
}

export interface BSEquipment {
  id: number;
  name: string;
}

export interface BSBuffies {
  gadget: boolean;
  starPower: boolean;
  hyperCharge: boolean;
}

export interface BSSkin {
  id: number;
  name: string;
}

export interface BSBattleLogItem {
  battleTime: string;
  event: {
    id: number;
    mode: string;
    map: string;
  };
  battle: {
    mode: string;
    type: string;
    result?: string;
    duration?: number;
    trophyChange?: number;
    starPlayer?: { tag: string; name: string; brawler: { id: number; name: string } };
  };
}

export interface BSClubMember {
  tag: string;
  name: string;
  nameColor: string;
  role: string;
  trophies: number;
  icon: { id: number };
}

export interface BSClubInfo {
  tag: string;
  name: string;
  description: string;
  type: string;
  badgeId: number;
  requiredTrophies: number;
  trophies: number;
  members: BSClubMember[];
}

export interface BSBrawlerData {
  id: number;
  name: string;
  power: number;       // 1-11
  trophies: number;
  highestTrophies: number;
  rank: number;        // medal rank icon number
  imageUrl: string;    // portrait URL from /brawlers API

  prestigeLevel?: number;
  currentWinStreak?: number;
  maxWinStreak?: number;
  skin?: BSSkin;

  gadgets: number;
  starPowers: number;
  gadgetsList: BSEquipment[];
  starPowersList: BSEquipment[];
  gearsList: BSEquipment[];
  hyperCharges?: BSEquipment[];
  buffies?: BSBuffies;
}

export interface CoCHeroEquipment {
  name: string;
  level: number;
  maxLevel: number;
  village: string;
}

export interface CoCHeroData {
  name: string;
  shortName: string;   // BK, AQ, GW, RC, BM
  level: number;
  maxLevel: number;
  emoji: string;
  color: string;       // accent color for this hero
  equipment?: CoCHeroEquipment[];
}

export interface CoCTroopData {
  name: string;
  level: number;
  maxLevel: number;
  iconUrl?: string;
}

export interface CoCAchievement {
  name: string;
  stars: number;
  value: number;
  target: number;
  info: string;
  completionInfo: string | null;
  village: string;
}

export interface CoCLegendStatistics {
  legendTrophies: number;
  bestSeason?: {
    id: string;
    rank: number;
    trophies: number;
  };
  currentSeason?: {
    trophies: number;
  };
}

export interface GameVisuals {
  // Clash Royale
  cr?: {
    currentDeck: CRCardData[];          // 8 cards, with iconUrl
    cards: CRCardData[];                // all unlocked cards
    favoriteCard?: CRCardData;
    clanBadgeUrl?: string;
    clanTag?: string;
    arenaName?: string;
    arenaId?: number;
    arenaIconUrl?: string;             // direct from API arena.iconUrls

    // New fields
    expPoints?: number;
    totalExpPoints?: number;

    // Competitive & Seasons
    legacyTrophyRoadHighScore?: number;
    leagueStatistics?: {
      currentSeason?: CRSeasonStats;
      previousSeason?: CRSeasonStats;
      bestSeason?: CRSeasonStats;
    };
    pathOfLegend?: {
      currentSeason?: CRSeasonStats;
      lastSeason?: CRSeasonStats;
      bestSeason?: CRSeasonStats;
    };

    // Badges & Achievements
    badges?: CRBadge[];
    achievements?: CRAchievement[];

    // Tower / Support
    supportCards?: CRTowerTroop[];
    currentDeckSupportCards?: CRTowerTroop[];
  };
  // Brawl Stars
  bs?: {
    topBrawlers: BSBrawlerData[];       // top 9 by trophies
    allBrawlers: BSBrawlerData[];       // all unlocked brawlers
    clubTag?: string;
    club?: BSClubInfo;
    battlelog?: BSBattleLogItem[];
    iconId?: number;                    // player icon from API (icon.id)

    // Global stats
    nameColor?: string;
    prestigeLevel?: number;
    expPoints?: number;
    victories3v3?: number;
    victoriesSolo?: number;
    victoriesDuo?: number;
    bestRoboRumbleTime?: number;
  };
  // Clash of Clans
  coc?: {
    heroes: CoCHeroData[];
    heroEquipment?: CoCHeroEquipment[];
    achievements?: CoCAchievement[];
    legendStatistics?: CoCLegendStatistics;
    clanCapitalContributions?: number;
    builderBaseTrophies?: number;
    bestBuilderBaseTrophies?: number;
    warStars?: number;

    leagueName: string;
    leagueBadgeUrl?: string;
    clanName?: string;
    clanBadgeUrl?: string;
    clanRole?: string;
    clanLevel?: number;

    townHallLevel: number;
    builderHallLevel: number;
    troops?: CoCTroopData[];
    superTroops?: CoCTroopData[];
    builderBaseTroops?: CoCTroopData[];
    spells?: CoCTroopData[];
    siegeMachines?: CoCTroopData[];
    pets?: CoCTroopData[];
  };
}

export interface PlayerStats {
  username: string;
  rank: string;
  rankIcon: string;
  winRate: number;
  kd: number;
  totalMatches: number;
  hoursPlayed: number;
  level: number;
  /** Current trophies as a plain number (source of truth for recent-search cards). */
  trophies?: number;
  recentMatches: Match[];
  performanceData: PerformancePoint[];
  statLabels?: StatLabels;
  extraStats?: Array<{ label: string; value: string | number }>;
  gameVisuals?: GameVisuals;
}

export interface Match {
  id: string;
  mode: string;
  result: 'win' | 'loss' | 'draw';
  kills?: number;
  deaths?: number;
  assists?: number;
  score?: number;
  date: string;
  duration: string;
}

export interface PerformancePoint {
  date: string;
  winRate: number;
  kd: number;
}

const ranks = [
  { name: 'Iron', icon: '🔩' },
  { name: 'Bronze', icon: '🥉' },
  { name: 'Silver', icon: '🥈' },
  { name: 'Gold', icon: '🥇' },
  { name: 'Platinum', icon: '💎' },
  { name: 'Diamond', icon: '💠' },
  { name: 'Master', icon: '👑' },
  { name: 'Grandmaster', icon: '⚜️' },
  { name: 'Challenger', icon: '✨' }
];

const modes = ['Ranked Solo', 'Ranked Duo', 'Competitive', 'Casual', 'Arena', 'Tournament'];

export const generatePlayerStats = (username: string, gameId: string): PlayerStats => {
  const hash = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rankIndex = hash % ranks.length;
  const winRate = 45 + (hash % 20);
  const kd = 0.8 + ((hash % 30) / 10);
  const totalMatches = 100 + (hash % 500);
  const hoursPlayed = 50 + (hash % 450);
  const level = 20 + (hash % 80);

  const recentMatches: Match[] = Array.from({ length: 10 }, (_, i) => {
    const matchHash = hash + i;
    return {
      id: `match-${i}`,
      mode: modes[matchHash % modes.length],
      result: (matchHash % 3 === 0 ? 'win' : matchHash % 3 === 1 ? 'loss' : 'draw') as 'win' | 'loss' | 'draw',
      kills: 5 + (matchHash % 20),
      deaths: 3 + (matchHash % 15),
      assists: 2 + (matchHash % 10),
      score: 1000 + (matchHash % 3000),
      date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      duration: `${15 + (matchHash % 30)}m`
    };
  });

  const performanceData: PerformancePoint[] = Array.from({ length: 14 }, (_, i) => {
    const dayHash = hash + i * 100;
    return {
      date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      winRate: Math.max(30, Math.min(70, winRate + ((dayHash % 20) - 10))),
      kd: Math.max(0.5, Math.min(3, kd + ((dayHash % 10) / 10 - 0.5)))
    };
  });

  let gameVisuals: GameVisuals | undefined;
  if (gameId === 'brawl-stars') {
    const mockBrawlers: BSBrawlerData[] = Array.from({ length: 45 }, (_, k) => ({
      id: 16000000 + k,
      name: `Brawler ${k + 1}`,
      power: 1 + (hash + k) % 11,
      trophies: 10 + (hash * k) % 1000,
      highestTrophies: (10 + (hash * k) % 1000) + 50,
      rank: 1 + (hash + k) % 35,
      imageUrl: `https://cdn.brawlify.com/brawler-bs/${16000000 + k}.png`,
      gadgets: (hash + k) % 3,
      starPowers: (hash + k) % 3,
      gadgetsList: Array.from({ length: (hash + k) % 3 }, (_, i) => ({ id: 23000000 + i, name: `Gadget ${i + 1}` })),
      starPowersList: Array.from({ length: (hash + k) % 3 }, (_, i) => ({ id: 23000000 + i, name: `Star Power ${i + 1}` })),
      gearsList: Array.from({ length: (hash + k) % 4 }, (_, i) => ({ id: 23000000 + i, name: `Gear ${i + 1}` })),
    })).sort((a, b) => b.trophies - a.trophies);

    gameVisuals = {
      bs: {
        topBrawlers: mockBrawlers.slice(0, 9),
        allBrawlers: mockBrawlers,
        clubTag: '#CLUB123'
      }
    };
  } else if (gameId === 'clash-royale') {
    const mockCards: CRCardData[] = Array.from({ length: 50 }, (_, k) => ({
      id: 26000000 + k,
      name: `Card ${k + 1}`,
      level: 1 + (hash + k) % 15,
      maxLevel: 15,
      count: (hash * k) % 1000,
      maxCount: 1000,
      iconUrl: '',
      rarity: ['Common', 'Rare', 'Epic', 'Legendary', 'Champion'][(hash + k) % 5]
    })).sort((a, b) => b.level - a.level);

    gameVisuals = {
      cr: {
        currentDeck: mockCards.slice(0, 8),
        cards: mockCards,
        favoriteCard: mockCards[0],
        clanBadgeUrl: '',
        arenaName: 'Arena 15'
      }
    };
  } else if (gameId === 'clash-of-clans') {
    const mockTroops: CoCTroopData[] = Array.from({ length: 20 }, (_, k) => ({
      name: `Troop ${k + 1}`,
      level: 1 + (hash + k) % 10,
      maxLevel: 10
    }));
    const mockSpells: CoCTroopData[] = Array.from({ length: 10 }, (_, k) => ({
      name: `Spell ${k + 1}`,
      level: 1 + (hash + k) % 5,
      maxLevel: 5
    }));

    gameVisuals = {
      coc: {
        heroes: [
          { name: 'Barbarian King', shortName: 'BK', level: 50, maxLevel: 95, emoji: '⚔️', color: '#c0392b' },
          { name: 'Archer Queen', shortName: 'AQ', level: 55, maxLevel: 95, emoji: '🏹', color: '#8e44ad' }
        ],
        leagueName: 'Crystal League',
        townHallLevel: 12,
        builderHallLevel: 8,
        troops: mockTroops,
        spells: mockSpells,
      }
    };
  }

  return {
    username,
    rank: `${ranks[rankIndex].name} ${1 + (hash % 4)}`,
    rankIcon: ranks[rankIndex].icon,
    winRate,
    kd: Math.round(kd * 100) / 100,
    totalMatches,
    hoursPlayed,
    level,
    recentMatches,
    performanceData,
    gameVisuals
  };
};

export interface ProfileGame {
  gameId: string;
  gameName: string;
  username: string;
  rank: string;
  rankIcon: string;
  winRate: number;
  hoursPlayed: number;
  lastPlayed: string;
}

export const generateProfileData = (): ProfileGame[] => {
  const profileGames = [
    { gameId: 'clash-royale', gameName: 'Clash Royale', username: 'Player#CR' },
    { gameId: 'brawl-stars', gameName: 'Brawl Stars', username: 'Player#BS' },
    { gameId: 'clash-of-clans', gameName: 'Clash of Clans', username: 'Player#CoC' },
    { gameId: 'hay-day', gameName: 'Hay Day', username: 'Player#HD' },
  ];

  return profileGames.map((game, i) => {
    const hash = game.username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rankIndex = (hash + i) % ranks.length;
    return {
      ...game,
      rank: `${ranks[rankIndex].name} ${1 + (hash % 4)}`,
      rankIcon: ranks[rankIndex].icon,
      winRate: 45 + ((hash + i * 10) % 25),
      hoursPlayed: 50 + ((hash + i * 20) % 300),
      lastPlayed: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  });
};
