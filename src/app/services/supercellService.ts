import { apiKeys } from './apiKeys';
import { PlayerStats, Match, BSBrawlerData } from '../data/mockStats';
import { BRAWLER_RENAMES } from '../data/brawlerPatches';
type SupercellGame = 'clash-royale' | 'brawl-stars' | 'clash-of-clans';

// Player tags only ever contain these characters; O is a common typo for 0.
const TAG_CHARSET = /^[0289PYLQGRJCUV]+$/;

export function normalizeTag(tag: string): string {
    const t = tag.trim().toUpperCase().replace(/^#/, '').replace(/O/g, '0');
    return '#' + t;
}

export function isValidTag(tag: string): boolean {
    const t = normalizeTag(tag).slice(1);
    return t.length >= 3 && t.length <= 14 && TAG_CHARSET.test(t);
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

// "pathOfLegend" → "Path of Legend", "PvP" → "Ladder".
const MODE_ALIASES: Record<string, string> = {
    PvP: 'Ladder',
    pathOfLegend: 'Path of Legend',
    riverRacePvP: 'River Race',
    riverRaceDuel: 'River Race Duel',
    boatBattle: 'Boat Battle',
    unknown: 'Brawl Hockey',
};

function prettyMode(raw: string | undefined): string {
    if (!raw) return 'Battle';
    if (MODE_ALIASES[raw]) return MODE_ALIASES[raw];
    const spaced = raw.replace(/([a-z\d])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Turn a newest-first battlelog into a chronological trophy trend.
 * The API never sends a running total, but it does send each battle's delta,
 * so the curve is reconstructed backwards from the player's current count.
 */
function buildTrophyTrend(
    battles: any[],
    currentTrophies: number,
    delta: (b: any) => number,
    date: (b: any) => string,
    mode: (b: any) => string
) {
    let running = currentTrophies;
    const points = battles.map((b) => {
        const d = delta(b);
        const point = {
            date: date(b),
            trophies: running,
            delta: d,
            mode: mode(b),
            result: (d > 0 ? 'win' : d < 0 ? 'loss' : 'draw') as 'win' | 'loss' | 'draw',
        };
        running -= d;
        return point;
    });
    return points.reverse();
}

const FETCH_TIMEOUT_MS = 10_000;

// Map raw Supercell API "reason" codes to messages a visitor can understand.
function friendlyApiError(status: number, reason: string, fallback: string): string {
    if (status === 404 || reason === 'notFound') return 'Player not found. Double-check the tag.';
    if (status === 429) return 'Too many requests — please wait a moment and try again.';
    if (reason === 'inMaintenance') return 'The game servers are currently in maintenance. Please try again later.';
    if (reason.startsWith('accessDenied')) return 'API key problem (invalid key or IP not allowed). Check the server configuration.';
    return fallback || 'Unexpected error from the Supercell API.';
}

async function fetchSupercell<T>(url: string, apiKey: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
        // No key client-side (production): send no Authorization header —
        // the reverse proxy injects it server-side.
        res = await fetch(url, {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
            signal: controller.signal,
        });
    } catch (e) {
        throw new Error(
            e instanceof DOMException && e.name === 'AbortError'
                ? 'The request timed out. Please try again.'
                : 'Network error while contacting the API.',
            { cause: e },
        );
    } finally {
        clearTimeout(timer);
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(friendlyApiError(res.status, String(err?.reason ?? ''), String(err?.message ?? `HTTP ${res.status}`)));
    }
    return res.json() as Promise<T>;
}

// ─────────────────────────────────────────
// Game catalogs (how many cards / brawlers exist right now)
// ─────────────────────────────────────────
// Supercell keeps shipping new cards and brawlers, so any hardcoded
// denominator ("x / 121 cards") goes wrong within weeks. Ask the API instead
// and cache the promise for the lifetime of the tab — one request per session.
const catalogCounts = new Map<string, Promise<number>>();

function catalogCount(url: string, key: string, fallback: number): Promise<number> {
    let cached = catalogCounts.get(url);
    if (!cached) {
        cached = fetchSupercell<any>(url, key)
            .then((r) => (Array.isArray(r?.items) ? r.items.length : fallback))
            .catch(() => fallback);
        catalogCounts.set(url, cached);
    }
    return cached;
}

// The battlelog is optional data: when it fails we must say so rather than
// render a confident "0% win rate" built on zero battles.
interface BattleLog {
    battles: any[];
    failed: boolean;
}

export function toBattleLog(raw: any): BattleLog {
    // Clash Royale returns a bare JSON array; Brawl Stars wraps it in { items }.
    if (Array.isArray(raw)) return { battles: raw, failed: false };
    if (Array.isArray(raw?.items)) return { battles: raw.items, failed: false };
    return { battles: [], failed: true };
}


// Clash Royale reports card levels relative to each rarity (a level-8
// legendary and a level-14 rare are both "max"). The UI wants the single
// unified scale the game itself shows, which currently tops out at 16.
const CR_MAX_LEVEL = 16;

export function displayCardLevel(c: any): number {
    const rarityMax = c?.maxLevel ?? 14;
    return Math.min((c?.level ?? 1) + (CR_MAX_LEVEL - rarityMax), CR_MAX_LEVEL);
}

// Helper to determine exact cards needed for next CR level
function getCRCardsTarget(level: number, rarity: string): number {
    if (level >= 16) return 50000;
    const r = (rarity || 'common').toLowerCase();

    // As of Level 16 update:
    let targets: number[];
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

    const [player, rawBattleLog, cardsInGame] = await Promise.all([
        fetchSupercell<any>(`/api/clash-royale/players/${encodedTag}`, key),
        fetchSupercell<any>(`/api/clash-royale/players/${encodedTag}/battlelog`, key)
            .catch(() => null),
        catalogCount('/api/clash-royale/cards', key, 0),
    ]);

    const { battles, failed: battleLogFailed } = toBattleLog(rawBattleLog);
    const wins: number = player.wins ?? 0;
    const losses: number = player.losses ?? 0;
    const total: number = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
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

    const arenaName: string = player.arena?.name ?? '';
    const arenaId: number | null = player.arena?.id ?? null;
    // Use the actual icon URL from the API — most reliable source
    const arenaIconUrl: string = player.arena?.iconUrls?.large ?? player.arena?.iconUrls?.medium ?? '';

    const expPoints: number = player.expPoints ?? 0;
    const totalExpPoints: number = player.totalExpPoints ?? 0;
    const clanTag: string = player.clan?.tag ?? '';
    const clanName: string = player.clan?.name ?? 'No Clan';
    const clanRole: string = player.role ?? 'Member';
    const clanBadgeUrl: string = player.clan?.badgeUrl ?? '';
    const legacyTrophyRoadHighScore: number = player.legacyTrophyRoadHighScore ?? 0;

    // Path of legend stats
    const pathOfLegend = {
        currentSeason: player.currentPathOfLegendSeasonResult ? {
            rank: player.currentPathOfLegendSeasonResult.rank,
            trophies: player.currentPathOfLegendSeasonResult.trophies
        } : undefined,
        lastSeason: player.lastPathOfLegendSeasonResult ? {
            rank: player.lastPathOfLegendSeasonResult.rank,
            trophies: player.lastPathOfLegendSeasonResult.trophies
        } : undefined,
        bestSeason: player.bestPathOfLegendSeasonResult ? {
            rank: player.bestPathOfLegendSeasonResult.rank,
            trophies: player.bestPathOfLegendSeasonResult.trophies
        } : undefined
    };

    // League stats
    const leagueStatistics = {
        currentSeason: player.leagueStatistics?.currentSeason ? {
            id: player.leagueStatistics.currentSeason.id,
            rank: player.leagueStatistics.currentSeason.rank,
            trophies: player.leagueStatistics.currentSeason.trophies,
            bestTrophies: player.leagueStatistics.currentSeason.bestTrophies
        } : undefined,
        previousSeason: player.leagueStatistics?.previousSeason ? {
            id: player.leagueStatistics.previousSeason.id,
            rank: player.leagueStatistics.previousSeason.rank,
            trophies: player.leagueStatistics.previousSeason.trophies,
            bestTrophies: player.leagueStatistics.previousSeason.bestTrophies
        } : undefined,
        bestSeason: player.leagueStatistics?.bestSeason ? {
            id: player.leagueStatistics.bestSeason.id,
            rank: player.leagueStatistics.bestSeason.rank,
            trophies: player.leagueStatistics.bestSeason.trophies,
        } : undefined
    };

    // Badges
    const badges = (player.badges ?? []).map((b: any) => ({
        name: b.name,
        level: b.level ?? 0,
        maxLevel: b.maxLevel ?? 0,
        progress: b.progress ?? 0,
        target: b.target ?? 0,
        iconUrl: b.iconUrls?.large ?? ''
    }));

    // Achievements
    const achievements = (player.achievements ?? []).map((a: any) => ({
        name: a.name,
        stars: a.stars ?? 0,
        value: a.value ?? 0,
        target: a.target ?? 0,
        info: a.info ?? '',
        completionInfo: a.completionInfo ?? null
    }));

    // Tower Troops
    const mapSupportCard = (t: any) => ({
        id: t.id,
        name: t.name,
        level: displayCardLevel(t),
        maxLevel: CR_MAX_LEVEL,
        rarity: t.rarity ?? 'common',
        iconUrl: t.iconUrls?.medium ?? ''
    });

    const supportCards = (player.supportCards ?? []).map(mapSupportCard);
    const currentDeckSupportCards = (player.currentDeckSupportCards ?? []).map(mapSupportCard);

    // Helper map for cards
    const mapCardInfo = (c: any) => {
        const actualLevel = displayCardLevel(c);
        return {
            id: c.id ?? 0,
            name: c.name ?? 'Unknown',
            level: actualLevel,
            maxLevel: CR_MAX_LEVEL,
            count: c.count ?? 0,
            maxCount: getCRCardsTarget(actualLevel, c.rarity),
            iconUrl: c.iconUrls?.medium ?? '',
            rarity: c.rarity ?? '',
            elixirCost: c.elixirCost,
            starLevel: c.starLevel,
            evolutionLevel: c.evolutionLevel,
            maxEvolutionLevel: c.maxEvolutionLevel,
            evolutionIconUrl: c.iconUrls?.evolutionMedium ?? c.iconUrls?.heroMedium
        };
    };

    const rawDeck: any[] = player.currentDeck ?? [];
    const currentDeck = rawDeck.map(mapCardInfo);

    // Favorite card
    const rawFav: any = player.currentFavouriteCard;
    const favoriteCard = rawFav ? {
        ...mapCardInfo(rawFav),
        level: 0,
        count: 0,
        maxCount: 1,
    } : undefined;

    const league: string = player.currentPathOfLegendSeasonResult?.leagueNumber
        ? `League ${player.currentPathOfLegendSeasonResult.leagueNumber}`
        : player.leagueStatistics?.currentSeason?.bestTrophies
            ? `${player.leagueStatistics.currentSeason.bestTrophies} PL 🏆`
            : arenaName;

    const recentMatches: Match[] = battles.slice(0, 10).map((b: any, i: number) => {
        const myCrowns = b.team?.[0]?.crowns ?? 0;
        const oppCrowns = b.opponent?.[0]?.crowns ?? 0;
        const change = b.team?.[0]?.trophyChange;
        return {
            id: `match-${i}`,
            mode: prettyMode(b.type),
            result: myCrowns > oppCrowns ? 'win' : myCrowns < oppCrowns ? 'loss' : 'draw',
            kills: myCrowns,
            deaths: oppCrowns,
            assists: 0,
            score: typeof change === 'number' ? change : undefined,
            date: parseSCDate(b.battleTime),
            duration: '',
        };
    });

    // Real trophy progression, reconstructed backwards from the current count.
    // Only battles that actually moved trophies belong on the trend.
    const performanceData = buildTrophyTrend(
        battles.filter((b: any) => typeof b.team?.[0]?.trophyChange === 'number'),
        trophies,
        (b: any) => b.team[0].trophyChange,
        (b: any) => parseSCDate(b.battleTime),
        (b: any) => prettyMode(b.type)
    );

    return {
        username: player.name,
        trophies,
        rank: league || `${trophies} 🏆`,
        rankIcon: arenaIconUrl || '👑',
        winRate,
        kd: Math.round((wins / Math.max(losses, 1)) * 100) / 100,
        totalMatches: total,
        hoursPlayed: trophies,
        level: player.expLevel ?? 1,
        dataNotice: battleLogFailed ? 'Battle log unavailable right now — recent-battle stats are hidden.' : undefined,
        recentMatches,
        performanceData,
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
            {
                label: 'Cards Found',
                value: cardsInGame > 0
                    ? `${player.cards?.length ?? 0} / ${cardsInGame}`
                    : `${player.cards?.length ?? 0}`,
            },
            { label: 'Est. Time Played (≈3 min/battle)', value: fmtTime(estimatedSeconds) },
            { label: 'Clan', value: `${clanName} · ${clanRole}` },
        ],
        gameVisuals: {
            cr: {
                currentDeck,
                cards: (player.cards ?? []).map(mapCardInfo).sort((a: any, b: any) => b.level - a.level),
                favoriteCard,
                clanBadgeUrl,
                clanTag,
                arenaName,
                arenaId: arenaId || undefined,
                arenaIconUrl: arenaIconUrl || undefined,
                expPoints,
                totalExpPoints,
                legacyTrophyRoadHighScore,
                leagueStatistics,
                pathOfLegend,
                badges,
                achievements,
                supportCards,
                currentDeckSupportCards,
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
    // Local copy preferred, CDN as fallback (CDN images load fine in browser)
    return `https://cdn.brawlify.com/brawlers/borders/${id}.png`;
}

// Single mapper for API brawler → BSBrawlerData (used for both top and full grids).
function mapBrawler(b: any): BSBrawlerData {
    const name: string = BRAWLER_RENAMES[b.name] ?? b.name ?? '?';

    // These lists are what the player OWNS, not what exists in the game. An
    // empty list means "not unlocked yet" and must stay empty — backfilling it
    // from a static table invented gadgets and star powers for real accounts.
    const gadgetsList = (b.gadgets ?? []).map((g: any) => ({ id: g.id, name: g.name }));
    const starPowersList = (b.starPowers ?? []).map((sp: any) => ({ id: sp.id, name: sp.name }));

    return {
        id: b.id ?? 0,
        name,
        power: b.power ?? 1,
        trophies: b.trophies ?? 0,
        highestTrophies: b.highestTrophies ?? b.trophies ?? 0,
        rank: b.rank ?? 1,
        imageUrl: brawlerImageUrl(b.id),

        prestigeLevel: b.prestigeLevel ?? 0,
        currentWinStreak: b.currentWinStreak ?? 0,
        maxWinStreak: b.maxWinStreak ?? 0,
        skin: b.skin ? { id: b.skin.id, name: b.skin.name } : undefined,

        gadgets: gadgetsList.length,
        starPowers: starPowersList.length,
        gadgetsList,
        starPowersList,
        gearsList: (b.gears ?? []).map((g: any) => ({ id: g.id, name: g.name })),
        hyperCharges: (b.hyperCharges ?? []).map((hc: any) => ({ id: hc.id, name: hc.name })),
        buffies: {
            gadget: b.buffies?.gadget ?? false,
            starPower: b.buffies?.starPower ?? false,
            hyperCharge: b.buffies?.hyperCharge ?? false
        }
    };
}

/**
 * Did this Brawl Stars battle go well?
 *
 * Only team modes report `result`. Showdown reports a placement, so the site
 * used to score every Showdown battle as a non-win — a showdown-only player saw
 * a flat 0% win rate. The trophy delta is the game's own verdict and is checked
 * first; the placement is the fallback when a battle moved no trophies.
 * Returns undefined when the outcome genuinely cannot be determined, so those
 * battles can be excluded from the denominator instead of counted as losses.
 */
export function bsOutcome(b: any): 'win' | 'loss' | 'draw' | undefined {
    const battle = b?.battle;
    if (!battle) return undefined;
    if (battle.result === 'victory') return 'win';
    if (battle.result === 'defeat') return 'loss';
    if (battle.result === 'draw') return 'draw';

    if (typeof battle.trophyChange === 'number' && battle.trophyChange !== 0) {
        return battle.trophyChange > 0 ? 'win' : 'loss';
    }
    if (typeof battle.rank === 'number') {
        const entrants = Array.isArray(battle.teams) ? battle.teams.length
            : Array.isArray(battle.players) ? battle.players.length
                : 10;
        return battle.rank <= Math.floor(entrants / 2) ? 'win' : 'loss';
    }
    return undefined;
}

/**
 * Win/loss tally for a Brawl Stars battle log. Only decisive battles count: a
 * draw or an unparsable mode is neither a win nor a loss and stays out of the
 * win-rate denominator.
 */
export function bsWinStats(battles: any[]): { battleWins: number; battleLosses: number; winRate: number } {
    const outcomes = battles.map(bsOutcome);
    const battleWins = outcomes.filter((o) => o === 'win').length;
    const battleLosses = outcomes.filter((o) => o === 'loss').length;
    const decided = battleWins + battleLosses;
    return { battleWins, battleLosses, winRate: decided > 0 ? Math.round((battleWins / decided) * 100) : 0 };
}

async function searchBrawlStars(tag: string): Promise<PlayerStats> {
    const key = apiKeys.get('brawlStars');
    const encodedTag = encodeURIComponent(normalizeTag(tag));

    const [player, rawBattleLog, brawlersInGame] = await Promise.all([
        fetchSupercell<any>(`/api/brawl-stars/players/${encodedTag}`, key),
        fetchSupercell<any>(`/api/brawl-stars/players/${encodedTag}/battlelog`, key).catch(() => null),
        catalogCount('/api/brawl-stars/brawlers', key, 0),
    ]);

    let clubInfo: any = undefined;
    if (player.club?.tag) {
        const clubTagEncoded = encodeURIComponent(normalizeTag(player.club.tag));
        clubInfo = await fetchSupercell<any>(`/api/brawl-stars/clubs/${clubTagEncoded}`, key).catch(() => undefined);
    }

    const { battles, failed: battleLogFailed } = toBattleLog(rawBattleLog);
    const { battleWins, battleLosses, winRate } = bsWinStats(battles);

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
    const topBrawlers: BSBrawlerData[] = sortedBrawlers.slice(0, 9).map(mapBrawler);

    const recentMatches: Match[] = battles.slice(0, 10).map((b: any, i: number) => ({
        id: `match-${i}`,
        mode: prettyMode(b.event?.mode ?? b.battle?.mode),
        result: bsOutcome(b) ?? 'draw',
        score: b.battle?.trophyChange ?? undefined,
        date: parseSCDate(b.battleTime),
        duration: b.battle?.duration ? `${Math.floor(b.battle.duration / 60)}m ${b.battle.duration % 60}s` : '',
    }));

    const performanceData = buildTrophyTrend(
        battles.filter((b: any) => typeof b.battle?.trophyChange === 'number'),
        trophies,
        (b: any) => b.battle.trophyChange,
        (b: any) => parseSCDate(b.battleTime),
        (b: any) => prettyMode(b.event?.mode ?? b.battle?.mode)
    );

    const allBrawlers: BSBrawlerData[] = sortedBrawlers.map(mapBrawler);

    return {
        username: player.name,
        trophies,
        rank: `${trophies.toLocaleString()} 🏆`,
        rankIcon: '⭐',
        winRate,
        kd: Math.round((battleWins / Math.max(battleLosses, 1)) * 100) / 100,
        totalMatches: totalVictories || battles.length,
        hoursPlayed: trophies,
        level: player.expLevel ?? 1,
        dataNotice: battleLogFailed ? 'Battle log unavailable right now — recent-battle stats are hidden.' : undefined,
        recentMatches,
        performanceData,
        statLabels: {
            stat1Title: 'Win Rate',
            stat1Sub: battleWins + battleLosses > 0
                ? `${battleWins} of last ${battleWins + battleLosses} battles`
                : 'No recent battles',
            stat2Title: 'W/L Ratio',
            stat2Sub: 'Recent battles',
            stat3Title: 'Total Victories',
            stat3Sub: brawlersInGame > 0
                ? `${brawlerCount}/${brawlersInGame} brawlers unlocked`
                : `${brawlerCount} brawlers unlocked`,
            stat4Title: 'Trophies',
            stat4Value: `${trophies.toLocaleString()} 🏆`,
            stat4Sub: `Best: ${highestTrophies.toLocaleString()}`,
        },
        extraStats: [
            { label: '3v3 Victories', value: `${v3v3.toLocaleString()} 🤝` },
            { label: 'Solo Victories', value: `${soloWins.toLocaleString()} 🎯` },
            { label: 'Duo Victories', value: `${duoWins.toLocaleString()} 👥` },
            ...(player.rankedRankName ? [{ label: 'Ranked', value: `${player.rankedRankName}${typeof player.rankedElo === 'number' ? ` · ${player.rankedElo.toLocaleString()} Elo` : ''}` }] : []),
            ...(player.highestAllTimeRankedRankName ? [{ label: 'Best Ranked (all time)', value: String(player.highestAllTimeRankedRankName) }] : []),
            { label: 'Brawlers at 1000+ 🏆', value: brawlersAt1000 },
            { label: 'Brawlers at 750+ 🏆', value: brawlersAt750 },
            { label: 'Maxed Brawlers (P11)', value: maxedBrawlers },
            { label: 'Club', value: clubName },
        ],
        gameVisuals: {
            bs: {
                topBrawlers,
                allBrawlers,
                clubTag: player.club?.tag,
                club: clubInfo ? {
                    tag: clubInfo.tag,
                    name: clubInfo.name,
                    description: clubInfo.description ?? '',
                    type: clubInfo.type ?? '',
                    badgeId: clubInfo.badgeId ?? 0,
                    requiredTrophies: clubInfo.requiredTrophies ?? 0,
                    trophies: clubInfo.trophies ?? 0,
                    members: (clubInfo.members ?? []).map((m: any) => ({
                        tag: m.tag,
                        name: m.name,
                        nameColor: m.nameColor ?? '#ffffff',
                        role: m.role ?? 'member',
                        trophies: m.trophies ?? 0,
                        icon: m.icon ?? { id: 0 }
                    }))
                } : undefined,
                battlelog: battles.map((b: any) => ({
                    battleTime: b.battleTime,
                    event: { id: b.event?.id ?? 0, mode: b.event?.mode ?? b.battle?.mode ?? '', map: b.event?.map ?? '' },
                    battle: {
                        mode: b.battle?.mode ?? '',
                        type: b.battle?.type ?? '',
                        rank: b.battle?.rank,
                        // Normalised so the battle log and the dashboard can never
                        // disagree about whether a Showdown run was a win.
                        result: b.battle?.result ?? (() => {
                            const o = bsOutcome(b);
                            return o === 'win' ? 'victory' : o === 'loss' ? 'defeat' : o;
                        })(),
                        duration: b.battle?.duration,
                        trophyChange: b.battle?.trophyChange,
                        starPlayer: b.battle?.starPlayer ? {
                            tag: b.battle.starPlayer.tag,
                            name: b.battle.starPlayer.name,
                            brawler: {
                                id: b.battle.starPlayer.brawler?.id ?? 0,
                                name: b.battle.starPlayer.brawler?.name ?? '',
                            }
                        } : undefined
                    }
                })),

                nameColor: player.nameColor,
                iconId: player.icon?.id ?? undefined,
                prestigeLevel: player.totalPrestigeLevel ?? 0,
                expPoints: player.expPoints ?? 0,
                victories3v3: player['3vs3Victories'] ?? 0,
                victoriesSolo: player.soloVictories ?? 0,
                victoriesDuo: player.duoVictories ?? 0,
                bestRoboRumbleTime: player.bestRoboRumbleTime ?? 0
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
    'Battle Machine': { shortName: 'BM', emoji: '🤖', color: '#7f8c8d', maxLevel: 35 },
    'Minion Prince': { shortName: 'MP', emoji: '😈', color: '#6c3483', maxLevel: 30 },
    'Dragon Duke': { shortName: 'DD', emoji: '🐉', color: '#8e44ad', maxLevel: 25 },
    'Battle Copter': { shortName: 'BC', emoji: '🚁', color: '#f39c12', maxLevel: 35 },
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
    const clanLevel: number = player.clan?.clanLevel ?? 0;
    const leagueName: string = player.league?.name ?? player.leagueTier?.name ?? 'Unranked';
    const leagueBadgeUrl: string = player.league?.iconUrls?.medium ?? player.leagueTier?.iconUrls?.medium ?? '';
    const builderBaseTrophies: number = player.builderBaseTrophies ?? 0;
    const bestBuilderBaseTrophies: number = player.bestBuilderBaseTrophies ?? 0;
    const clanCapitalContributions: number = player.clanCapitalContributions ?? 0;
    const legendStatistics = player.legendStatistics;

    // Hero Equipment full catalog
    const heroEquipment = player.heroEquipment?.map((e: any) => ({
        name: e.name,
        level: e.level,
        maxLevel: e.maxLevel,
        village: e.village
    })) ?? [];

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
                equipment: h.equipment?.map((e: any) => ({
                    name: e.name,
                    level: e.level,
                    maxLevel: e.maxLevel,
                    village: e.village
                })) ?? []
            };
        });

    // Achievements
    const achievements: any[] = player.achievements ?? [];
    const mappedAchievements = achievements.map(a => ({
        name: a.name,
        stars: a.stars ?? 0,
        value: a.value ?? 0,
        target: a.target ?? 0,
        info: a.info ?? '',
        completionInfo: a.completionInfo ?? null,
        village: a.village ?? 'home',
    }));

    const acvMap: Record<string, number> = {};
    for (const a of achievements) { acvMap[a.name] = a.value ?? 0; }
    const lifetimeAttackWins = acvMap['Conqueror'] ?? 0;
    const lifetimeDefenseWins = acvMap['Unbreakable'] ?? 0;
    const totalMatches = lifetimeAttackWins + lifetimeDefenseWins;
    const winRate = totalMatches > 0 ? Math.round((lifetimeAttackWins / totalMatches) * 100) : 0;

    const heroLine = heroList.map(h => `${h.shortName} ${h.level}`).join(' · ') || '—';
    const bm = heroList.find(h => h.shortName === 'BM');
    const bc = heroList.find(h => h.shortName === 'BC');

    // Categorize troops and spells
    const rawTroops: any[] = player.troops ?? [];
    const rawSpells: any[] = player.spells ?? [];

    const isSiegeName = (n: string) => n.includes('Wall Wrecker') || n.includes('Battle Blimp') || n.includes('Stone Slammer') || n.includes('Siege Barracks') || n.includes('Log Launcher') || n.includes('Flame Flinger') || n.includes('Battle Drill') || n === 'Drill' || n.includes('Troop Launcher');
    const isPetName = (n: string) => n.includes('L.A.S.S.I') || n.includes('Electro Owl') || n.includes('Mighty Yak') || n.includes('Unicorn') || n.includes('Frosty') || n.includes('Diggy') || n.includes('Poison Lizard') || n.includes('Phoenix') || n.includes('Spirit Fox') || n.includes('Angry Jelly') || n.includes('Sneezy') || n.includes('Greedy Raven');
    const isSuperName = (n: string) => n !== 'Super Yeti' && (n.includes('Super ') || n.includes('Sneaky ') || n.includes('Rocket ') || n === 'Ice Hound' || n === 'Inferno Dragon');
    const isExtraBaseTroop = (n: string) => ['Skeleton', 'Meteor Golem'].includes(n);

    const troops = rawTroops
        .filter(t => t.village === 'home' && !isSiegeName(t.name) && !isPetName(t.name) && !isSuperName(t.name) && !isExtraBaseTroop(t.name) && !COC_HEROES[t.name])
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const superTroops = rawTroops
        .filter(t => t.village === 'home' && isSuperName(t.name))
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const builderBaseTroops = rawTroops
        .filter(t => t.village === 'builderBase' && !isPetName(t.name) && !COC_HEROES[t.name])
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const siegeOrder = ['Wall Wrecker', 'Siege Barracks', 'Battle Blimp', 'Log Launcher', 'Flame Flinger', 'Battle Drill', 'Stone Slammer', 'Troop Launcher'];

    const siegeMachines = rawTroops
        .filter(t => t.village === 'home' && isSiegeName(t.name))
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    for (const rs of siegeOrder) {
        if (!siegeMachines.some(s => s.name.includes(rs))) {
            const defaultMaxLevel = rs === 'Stone Slammer' ? 5 : 4; // Most are 4, stone slammer is 5
            siegeMachines.push({ name: rs, level: 0, maxLevel: defaultMaxLevel });
        }
    }

    siegeMachines.sort((a, b) => {
        let ia = siegeOrder.findIndex(s => a.name.includes(s));
        let ib = siegeOrder.findIndex(s => b.name.includes(s));
        if (ia === -1) ia = 99;
        if (ib === -1) ib = 99;
        return ia - ib;
    });

    const pets = rawTroops
        .filter(t => t.village === 'home' && isPetName(t.name))
        .map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    const requiredPets = ['L.A.S.S.I', 'Mighty Yak', 'Electro Owl', 'Unicorn', 'Frosty', 'Diggy', 'Poison Lizard', 'Phoenix', 'Spirit Fox', 'Angry Jelly', 'Sneezy', 'Greedy Raven'];
    for (const rp of requiredPets) {
        if (!pets.some(p => p.name.includes(rp))) {
            pets.push({ name: rp, level: 0, maxLevel: 10 });
        }
    }

    // Ensure required modern heroes exist
    const requiredHomeHeroes = ['Barbarian King', 'Archer Queen', 'Grand Warden', 'Royal Champion', 'Minion Prince', 'Dragon Duke'];
    for (const h of requiredHomeHeroes) {
        if (!heroList.some(hero => hero.name === h)) {
            const meta = COC_HEROES[h];
            if (meta) {
                heroList.push({
                    name: h,
                    shortName: meta.shortName,
                    level: 0,
                    maxLevel: meta.maxLevel,
                    emoji: meta.emoji,
                    color: meta.color,
                    equipment: [],
                });
            }
        }
    }

    const spells = rawSpells.filter(t => t.village === 'home').map(t => ({ name: t.name, level: t.level, maxLevel: t.maxLevel }));

    return {
        username: player.name,
        trophies,
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
            ...(bc ? [{ label: 'Battle Copter', value: `Lv ${bc.level}` }] : []),
            { label: 'Current Trophies', value: `${trophies.toLocaleString()} 🏆` },
            { label: 'Best Trophies', value: `${bestTrophies.toLocaleString()} 🏆` },
            { label: 'War Stars', value: `${warStars.toLocaleString()} ⭐` },
            { label: 'Donations', value: `${donations.toLocaleString()} sent · ${donationsReceived.toLocaleString()} received` },
            { label: 'Clan', value: `${clanName} · ${clanRole}` },
        ],
        gameVisuals: {
            coc: {
                heroes: heroList,
                heroEquipment,
                achievements: mappedAchievements,
                legendStatistics,
                clanCapitalContributions,
                builderBaseTrophies,
                bestBuilderBaseTrophies,
                warStars,
                leagueName,
                leagueBadgeUrl,
                clanName,
                clanBadgeUrl,
                clanRole,
                clanLevel,
                townHallLevel: thLevel,
                builderHallLevel: bhLevel,
                troops,
                superTroops,
                builderBaseTroops,
                spells,
                siegeMachines,
                pets,
            }
        }
    };
}

// ─────────────────────────────────────────
// Router
// ─────────────────────────────────────────
export async function searchSupercellPlayer(tag: string, gameId: SupercellGame): Promise<PlayerStats> {
    switch (gameId) {
        case 'clash-royale': return searchClashRoyale(tag);
        case 'brawl-stars': return searchBrawlStars(tag);
        case 'clash-of-clans': return searchClashOfClans(tag);
        default: throw new Error(`No Supercell handler for ${gameId}`);
    }
}
