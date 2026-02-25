import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint, BSBrawlerData } from '../data/mockStats';

type SupercellGame = 'clash-royale' | 'brawl-stars' | 'clash-of-clans' | 'hay-day' | 'boom-beach';

function normalizeTag(tag: string): string {
    let t = tag.trim().toUpperCase();
    if (!t.startsWith('#')) t = '#' + t;
    return t;
}

function parseSCDate(battleTime: string | undefined): string {
    if (!battleTime) return 'N/A';
    const m = battleTime.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!m) {
        const d = new Date(battleTime);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(seconds: number): string {
    const w = Math.floor(seconds / 604800);
    const d = Math.floor((seconds % 604800) / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const parts: string[] = [];
    if (w > 0) parts.push(`${w}w`);
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    return parts.length > 0 ? parts.join(' ') : '< 1h';
}

async function fetchSupercell<T>(url: string, apiKey: string): Promise<T> {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.reason ?? err?.message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}


// Helper to determine exact cards needed for next CR level
function getCRCardsTarget(level: number, rarity: string): number {
    if (level >= 16) return 50000;
    const r = (rarity || 'common').toLowerCase();

    // As of Level 16 update:
    let targets: number[] = [];
    if (r === 'champion') targets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 5, 8, 11, 15];
    else if (r === 'legendary') targets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 9, 12, 14, 20];
    else if (r === 'epic') targets = [0, 0, 0, 0, 0, 0, 2, 4, 10, 20, 30, 50, 70, 100, 130, 180];
    else if (r === 'rare') targets = [0, 0, 0, 2, 4, 10, 20, 50, 100, 200, 300, 400, 550, 750, 1000, 1400];
    else targets = [0, 2, 4, 10, 20, 50, 100, 200, 400, 800, 1000, 1500, 2500, 3500, 5500, 7500];

    return targets[level] || Math.max(...targets) || 1;
}

// ─────────────────────────────────────────
// Clash Royale
// ─────────────────────────────────────────
async function searchClashRoyale(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('clashRoyale');
    const encodedTag = encodeURIComponent(normalizeTag(tag));

    const [player, battleLog] = await Promise.all([
        fetchSupercell<any>(`/api/clash-royale/players/${encodedTag}`, key),
        fetchSupercell<any>(`/api/clash-royale/players/${encodedTag}/battlelog`, key)
            .catch(() => ({ items: [] })),
    ]);

    const battles: any[] = battleLog.items ?? [];
    const wins: number = player.wins ?? 0;
    const losses: number = player.losses ?? 0;
    const total: number = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 50;
    const trophies: number = player.trophies ?? 0;
    const bestTrophies: number = player.bestTrophies ?? trophies;
    const totalDonations: number = player.totalDonations ?? player.donations ?? 0;
    const threeCrownWins: number = player.threeCrownWins ?? 0;
    const starPoints: number = player.starPoints ?? 0;
    const challengeMaxWins: number = player.challengeMaxWins ?? 0;
    const challengeCardsWon: number = player.challengeCardsWon ?? 0;
    const warDayWins: number = player.warDayWins ?? 0;
    const clanCardsCollected: number = player.clanCardsCollected ?? 0;
    const estimatedSeconds = total * 3 * 60;

    // Current deck — has iconUrls from API
    const rawDeck: any[] = player.currentDeck ?? [];
    const currentDeck = rawDeck.map((c: any) => {
        const absoluteMaxLevel = c.maxLevel === 14 ? 14 : 14;
        // 14 is the normal max. Elite is 15 but API normally caps maxLevel at 14 for math.
        // Base levels are 1 (Common), 3 (Rare), 6 (Epic), 9 (Legendary), 11 (Champion)
        // Normalize levels based on card rarity max level offset
        // The user reported the previous system was exactly 2 levels behind.
        const baseLevel = 15 - (c.maxLevel ?? 14);
        const actualLevel = baseLevel + (c.level ?? 1) + 1;

        return {
            id: c.id ?? 0,
            name: c.name ?? 'Unknown',
            level: actualLevel,
            maxLevel: 14,
            count: c.count ?? 0,
            maxCount: getCRCardsTarget(actualLevel, c.rarity),
            iconUrl: c.iconUrls?.medium ?? '',
            rarity: c.rarity ?? '',
        };
    });

    // Favorite card
    const rawFav: any = player.currentFavouriteCard;
    const favoriteCard = rawFav ? {
        id: rawFav.id ?? 0,
        name: rawFav.name ?? '',
        level: 0,
        maxLevel: 15,
        count: 0,
        maxCount: 1,
        iconUrl: rawFav.iconUrls?.medium ?? '',
        rarity: rawFav.rarity ?? '',
    } : undefined;

    // Clan badge
    const clanBadgeUrl: string = player.clan?.badgeUrl ?? '';
    const clanName: string = player.clan?.name ?? 'No Clan';
    const clanRole: string = player.role ?? 'Member';
    const arenaName: string = player.arena?.name ?? '';

    const league: string = player.currentPathOfLegendSeasonResult?.leagueNumber
        ? `League ${player.currentPathOfLegendSeasonResult.leagueNumber}`
        : player.leagueStatistics?.currentSeason?.bestTrophies
            ? `${player.leagueStatistics.currentSeason.bestTrophies} PL 🏆`
            : arenaName;

    const recentMatches: Match[] = battles.slice(0, 10).map((b: any, i: number) => {
        const myCrowns = b.team?.[0]?.crowns ?? 0;
        const oppCrowns = b.opponent?.[0]?.crowns ?? 0;
        return {
            id: `match-${i}`,
            mode: b.type ?? 'Ladder',
            result: myCrowns > oppCrowns ? 'win' : myCrowns < oppCrowns ? 'loss' : 'draw',
            kills: myCrowns,
            deaths: oppCrowns,
            assists: 0,
            score: 0,
            date: parseSCDate(b.battleTime),
            duration: '3m',
        };
    });

    return {
        username: player.name,
        rank: league || `${trophies} 🏆`,
        rankIcon: '👑',
        winRate,
        kd: Math.round((wins / Math.max(losses, 1)) * 100) / 100,
        totalMatches: total,
        hoursPlayed: trophies,
        level: player.expLevel ?? 1,
        recentMatches,
        performanceData: recentMatches.map(m => ({
            date: m.date,
            winRate: m.result === 'win' ? 100 : 0,
            kd: m.kills ?? 0,
        })).reverse(),
        statLabels: {
            stat1Title: 'Win Rate',
            stat1Sub: `${wins.toLocaleString()} wins · ${losses.toLocaleString()} losses`,
            stat2Title: 'W/L Ratio',
            stat2Sub: 'Career ratio',
            stat3Title: 'Total Battles',
            stat3Sub: `${threeCrownWins.toLocaleString()} 👑 3-Crown wins`,
            stat4Title: 'Current Trophies',
            stat4Value: `${trophies.toLocaleString()} 🏆`,
            stat4Sub: `Best: ${bestTrophies.toLocaleString()}`,
        },
        extraStats: [
            { label: '3-Crown Wins', value: `${threeCrownWins.toLocaleString()} 👑` },
            { label: 'Challenge Max Wins', value: challengeMaxWins },
            { label: 'Challenge Cards Won', value: challengeCardsWon.toLocaleString() },
            { label: 'War Day Wins', value: warDayWins },
            { label: 'Clan Cards Collected', value: clanCardsCollected.toLocaleString() },
            { label: 'Total Donations', value: totalDonations.toLocaleString() },
            { label: 'Star Points', value: starPoints.toLocaleString() },
            { label: 'Cards Found', value: `${player.cards?.length ?? 0} / 121` },
            { label: 'Estimated Time Played', value: fmtTime(estimatedSeconds) },
            { label: 'Clan', value: `${clanName} · ${clanRole}` },
        ],
        gameVisuals: {
            cr: {
                currentDeck,
                cards: (player.cards ?? []).map((c: any) => {
                    const baseLevel = 15 - (c.maxLevel ?? 14);
                    const actualLevel = baseLevel + (c.level ?? 1) + 1;
                    return {
                        id: c.id ?? 0,
                        name: c.name ?? 'Unknown',
                        level: actualLevel,
                        maxLevel: 14,
                        count: c.count ?? 0,
                        maxCount: getCRCardsTarget(actualLevel, c.rarity),
                        iconUrl: c.iconUrls?.medium ?? '',
                        rarity: c.rarity ?? '',
                    };
                }).sort((a: any, b: any) => b.level - a.level),
                favoriteCard,
                clanBadgeUrl,
                arenaName,
            },
        },
    };
}

// ─────────────────────────────────────────
// Brawl Stars
// ─────────────────────────────────────────
// Brawlify CDN for brawler portraits — reliable unofficial CDN used widely
function brawlerImageUrl(id: number): string {
    if (!id) return '';
    return `https://cdn.brawlify.com/brawlers/borders/${id}.png`;
}

const BS_RANK_COLORS = ['#888', '#5c5', '#55f', '#fa0', '#f55', '#a0f', '#f0f'];
function bsRankColor(rank: number): string {
    return BS_RANK_COLORS[Math.min(rank, BS_RANK_COLORS.length - 1)] ?? '#888';
}

async function searchBrawlStars(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('brawlStars');
    const encodedTag = encodeURIComponent(normalizeTag(tag));

    const [player, battleLog] = await Promise.all([
        fetchSupercell<any>(`/api/brawl-stars/players/${encodedTag}`, key),
        fetchSupercell<any>(`/api/brawl-stars/players/${encodedTag}/battlelog`, key)
            .catch(() => ({ items: [] })),
    ]);

    const battles: any[] = battleLog.items ?? [];
    const battleWins = battles.filter((b: any) => b.battle?.result === 'victory').length;
    const winRate = battles.length > 0 ? Math.round((battleWins / battles.length) * 100) : 50;

    const trophies: number = player.trophies ?? 0;
    const highestTrophies: number = player.highestTrophies ?? trophies;
    const brawlerCount: number = player.brawlers?.length ?? 0;
    const v3v3: number = player['3vs3Victories'] ?? 0;
    const soloWins: number = player.soloVictories ?? 0;
    const duoWins: number = player.duoVictories ?? 0;
    const totalVictories = v3v3 + soloWins + duoWins;
    const clubName: string = player.club?.name ?? 'No Club';

    // Sorted brawlers
    const sortedBrawlers = [...(player.brawlers ?? [])].sort((a: any, b: any) => b.trophies - a.trophies);
    const maxedBrawlers = sortedBrawlers.filter((b: any) => b.power === 11).length;
    const brawlersAt1000 = sortedBrawlers.filter((b: any) => b.trophies >= 1000).length;
    const brawlersAt750 = sortedBrawlers.filter((b: any) => b.trophies >= 750).length;

    // Top brawlers visual data (top 9 + all for grid)
    const topBrawlers: BSBrawlerData[] = sortedBrawlers.slice(0, 9).map((b: any) => ({
        id: b.id ?? 0,
        name: b.name ?? '?',
        power: b.power ?? 1,
        trophies: b.trophies ?? 0,
        highestTrophies: b.highestTrophies ?? b.trophies ?? 0,
        rank: b.rank ?? 1,
        imageUrl: brawlerImageUrl(b.id),
        gadgets: b.gadgets?.length ?? 0,
        starPowers: b.starPowers?.length ?? 0,
    }));

    const recentMatches: Match[] = battles.slice(0, 10).map((b: any, i: number) => {
        let mode = b.event?.mode ?? b.battle?.mode ?? 'Brawl';
        // Format mode e.g. "brawlBall" -> "Brawl Ball"
        mode = mode.replace(/([A-Z])/g, ' $1').trim();
        mode = mode.charAt(0).toUpperCase() + mode.slice(1);
        if (mode.toLowerCase() === 'unknown') mode = 'Brawl Hockey';

        return {
            id: `match-${i}`,
            mode: mode,
            result: b.battle?.result === 'victory' ? 'win' : b.battle?.result === 'defeat' ? 'loss' : 'draw',
            score: b.battle?.trophyChange ?? undefined,
            date: parseSCDate(b.battleTime),
            duration: b.battle?.duration ? `${Math.floor(b.battle.duration / 60)}m ${b.battle.duration % 60}s` : 'Unknown',
        };
    });

    return {
        username: player.name,
        rank: `${trophies.toLocaleString()} 🏆`,
        rankIcon: '⭐',
        winRate,
        kd: Math.round((battleWins / Math.max(battles.length - battleWins, 1)) * 100) / 100,
        totalMatches: totalVictories || battles.length,
        hoursPlayed: trophies,
        level: player.expLevel ?? 1,
        recentMatches,
        performanceData: [],
        statLabels: {
            stat1Title: 'Win Rate',
            stat1Sub: `${battleWins} wins (recent battles)`,
            stat2Title: 'W/L Ratio',
            stat2Sub: 'Recent battles',
            stat3Title: 'Total Victories',
            stat3Sub: `${brawlerCount}/99 brawlers unlocked`,
            stat4Title: 'Trophies',
            stat4Value: `${trophies.toLocaleString()} 🏆`,
            stat4Sub: `Best: ${highestTrophies.toLocaleString()}`,
        },
        extraStats: [
            { label: '3v3 Victories', value: `${v3v3.toLocaleString()} 🤝` },
            { label: 'Solo Victories', value: `${soloWins.toLocaleString()} 🎯` },
            { label: 'Duo Victories', value: `${duoWins.toLocaleString()} 👥` },
            { label: 'Brawlers at 1000+ 🏆', value: brawlersAt1000 },
            { label: 'Brawlers at 750+ 🏆', value: brawlersAt750 },
            { label: 'Maxed Brawlers (P11)', value: maxedBrawlers },
            { label: 'Club', value: clubName },
        ],
        gameVisuals: {
            bs: {
                topBrawlers, allBrawlers: sortedBrawlers.map((b: any) => ({
                    id: b.id ?? 0,
                    name: b.name ?? '?',
                    power: b.power ?? 1,
                    trophies: b.trophies ?? 0,
                    highestTrophies: b.highestTrophies ?? b.trophies ?? 0,
                    rank: b.rank ?? 1,
                    imageUrl: brawlerImageUrl(b.id),
                    gadgets: b.gadgets?.length ?? 0,
                    starPowers: b.starPowers?.length ?? 0,
                })), clubTag: player.club?.tag
            },
        },
    };
}

// ─────────────────────────────────────────
// Clash of Clans
// ─────────────────────────────────────────
const COC_HEROES: Record<string, { shortName: string; emoji: string; color: string; maxLevel: number }> = {
    'Barbarian King': { shortName: 'BK', emoji: '⚔️', color: '#c0392b', maxLevel: 95 },
    'Archer Queen': { shortName: 'AQ', emoji: '🏹', color: '#8e44ad', maxLevel: 95 },
    'Grand Warden': { shortName: 'GW', emoji: '📖', color: '#2980b9', maxLevel: 65 },
    'Royal Champion': { shortName: 'RC', emoji: '🛡️', color: '#e74c3c', maxLevel: 45 },
    'Battle Machine': { shortName: 'BM', emoji: '🤖', color: '#7f8c8d', maxLevel: 45 },
    'Minion Prince': { shortName: 'MP', emoji: '😈', color: '#6c3483', maxLevel: 30 },
};

async function searchClashOfClans(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('clashOfClans');
    const encodedTag = encodeURIComponent(normalizeTag(tag));

    const player = await fetchSupercell<any>(`/api/clash-of-clans/players/${encodedTag}`, key);

    const warStars: number = player.warStars ?? 0;
    const donations: number = player.donations ?? 0;
    const donationsReceived: number = player.donationsReceived ?? 0;
    const trophies: number = player.trophies ?? 0;
    const bestTrophies: number = player.bestTrophies ?? trophies;
    const thLevel: number = player.townHallLevel ?? 1;
    const bhLevel: number = player.builderHallLevel ?? 0;
    const clanName: string = player.clan?.name ?? 'No Clan';
    const clanRole: string = player.role ?? 'Member';
    const clanBadgeUrl: string = player.clan?.badgeUrls?.medium ?? '';
    const leagueName: string = player.league?.name ?? 'Unranked';
    const leagueBadgeUrl: string = player.league?.iconUrls?.medium ?? '';

    // Heroes
    const rawHeroes: any[] = player.heroes ?? [];
    const heroList = rawHeroes
        .filter(h => COC_HEROES[h.name])
        .map(h => {
            const meta = COC_HEROES[h.name];
            return {
                name: h.name,
                shortName: meta.shortName,
                level: h.level ?? 0,
                maxLevel: h.maxLevel ?? meta.maxLevel,
                emoji: meta.emoji,
                color: meta.color,
            };
        });

    // Achievements
    const achievements: any[] = player.achievements ?? [];
    const acvMap: Record<string, number> = {};
    for (const a of achievements) { acvMap[a.name] = a.value ?? 0; }
    const lifetimeAttackWins = acvMap['Conqueror'] ?? 0;
    const lifetimeDefenseWins = acvMap['Unbreakable'] ?? 0;
    const totalMatches = lifetimeAttackWins + lifetimeDefenseWins;
    const winRate = totalMatches > 0 ? Math.round((lifetimeAttackWins / totalMatches) * 100) : 50;

    const performanceData: PerformancePoint[] = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        winRate,
        kd: lifetimeAttackWins > 0 ? Math.round((lifetimeAttackWins / Math.max(lifetimeDefenseWins, 1)) * 100) / 100 : 0,
    }));

    const heroLine = heroList.map(h => `${h.shortName} ${h.level}`).join(' · ') || '—';
    const bm = heroList.find(h => h.shortName === 'BM');

    // Categorize troops and spells
    const rawTroops: any[] = player.troops ?? [];
    const rawSpells: any[] = player.spells ?? [];

    // We filter by village "home". Siege machines and pets come under troops but usually have specific names/flags in full API.
    // For simplicity, we just bucket them.
    const troops = rawTroops.filter(t => t.village === 'home' && !t.name.includes('L.A.S.S.I') && !t.name.includes('Electro Owl') && !t.name.includes('Mighty Yak') && !t.name.includes('Unicorn') && !t.name.includes('Frosty') && !t.name.includes('Diggy') && !t.name.includes('Poison Lizard') && !t.name.includes('Phoenix') && !t.name.includes('Spirit Fox') && !t.name.includes('Angry Jelly') && !t.name.includes('Wall Wrecker') && !t.name.includes('Battle Blimp') && !t.name.includes('Stone Slammer') && !t.name.includes('Siege Barracks') && !t.name.includes('Log Launcher') && !t.name.includes('Flame Flinger') && !t.name.includes('Battle Drill')).map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const siegeMachines = rawTroops.filter(t => t.village === 'home' && (t.name.includes('Wall Wrecker') || t.name.includes('Battle Blimp') || t.name.includes('Stone Slammer') || t.name.includes('Siege Barracks') || t.name.includes('Log Launcher') || t.name.includes('Flame Flinger') || t.name.includes('Battle Drill'))).map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const pets = rawTroops.filter(t => t.village === 'home' && (t.name.includes('L.A.S.S.I') || t.name.includes('Electro Owl') || t.name.includes('Mighty Yak') || t.name.includes('Unicorn') || t.name.includes('Frosty') || t.name.includes('Diggy') || t.name.includes('Poison Lizard') || t.name.includes('Phoenix') || t.name.includes('Spirit Fox') || t.name.includes('Angry Jelly'))).map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const spells = rawSpells.filter(t => t.village === 'home').map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    return {
        username: player.name,
        rank: leagueName,
        rankIcon: '🏰',
        winRate,
        kd: lifetimeAttackWins > 0
            ? Math.round((lifetimeAttackWins / Math.max(lifetimeDefenseWins, 1)) * 100) / 100
            : 0,
        totalMatches,
        hoursPlayed: donations,
        level: thLevel,
        recentMatches: [],
        performanceData: [],
        statLabels: {
            stat1Title: 'Attack Win Rate',
            stat1Sub: `${lifetimeAttackWins.toLocaleString()} attack wins (lifetime)`,
            stat2Title: 'Atk / Def Wins',
            stat2Value: `${lifetimeAttackWins.toLocaleString()} / ${lifetimeDefenseWins.toLocaleString()}`,
            stat2Sub: 'Lifetime stats',
            stat3Title: 'War Stars',
            stat3Value: `${warStars.toLocaleString()} ⭐`,
            stat3Sub: `TH ${thLevel}${bhLevel > 0 ? ` · BH ${bhLevel}` : ''}`,
            stat4Title: 'Best Trophies',
            stat4Value: `${bestTrophies.toLocaleString()} 🏆`,
            stat4Sub: leagueName,
        },
        extraStats: [
            { label: 'Town Hall', value: `TH ${thLevel}` },
            { label: 'Builder Hall', value: bhLevel > 0 ? `BH ${bhLevel}` : 'N/A' },
            { label: 'Heroes', value: heroLine },
            ...(bm ? [{ label: 'Battle Machine', value: `Lv ${bm.level}` }] : []),
            { label: 'Current Trophies', value: `${trophies.toLocaleString()} 🏆` },
            { label: 'Best Trophies', value: `${bestTrophies.toLocaleString()} 🏆` },
            { label: 'War Stars', value: `${warStars.toLocaleString()} ⭐` },
            { label: 'Donations', value: `${donations.toLocaleString()} sent · ${donationsReceived.toLocaleString()} received` },
            { label: 'Clan', value: `${clanName} · ${clanRole}` },
        ],
        gameVisuals: {
            coc: {
                heroes: heroList,
                leagueName,
                leagueBadgeUrl,
                clanBadgeUrl,
                townHallLevel: thLevel,
                builderHallLevel: bhLevel,
                troops,
                spells,
                siegeMachines,
                pets,
            },
        },
    };
}

// ─────────────────────────────────────────
// Router
// ─────────────────────────────────────────
export async function searchSupercellPlayer(tag: string, gameId: SupercellGame): Promise<PlayerStats> {
    switch (gameId) {
        case 'clash-royale': return searchClashRoyale(tag);
        case 'brawl-stars': return searchBrawlStars(tag);
        case 'clash-of-clans':
        case 'hay-day':
        case 'boom-beach': return searchClashOfClans(tag);
        default: throw new Error(`No Supercell handler for ${gameId}`);
    }
}
