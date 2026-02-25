import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

// Steam AppIDs for supported games
export const STEAM_APP_IDS: Record<string, number> = {
    'counter-strike-2': 730,
    'dota-2': 570,
    'rust': 252490,
    'team-fortress-2': 440,
    'helldivers-2': 553850,
    'palworld': 1623730,
    'ark': 346110,
    'payday-3': 1272080,
    'resident-evil-4': 2050650,
    'baldurs-gate-3': 1086940,
    'satisfactory': 526870,
};

async function fetchSteam<T>(path: string): Promise<T> {
    const res = await fetch(`/api/steam${path}`);
    if (!res.ok) throw new Error(`Steam API error: HTTP ${res.status}`);
    return res.json() as Promise<T>;
}

async function resolveVanityUrl(vanity: string): Promise<string> {
    const key = apiKeys.get('steam');
    const data = await fetchSteam<any>(`/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`);
    if (data.response?.success === 1) return data.response.steamid;
    throw new Error('Could not resolve Steam vanity URL. Try entering your SteamID64 directly.');
}

async function getSteamId(input: string): Promise<string> {
    // Pure 64-bit SteamID  (17 digits starting with 7656)
    if (/^7656\d{13}$/.test(input.trim())) return input.trim();
    // Vanity URL or username
    return resolveVanityUrl(input.trim());
}

export async function searchSteamPlayer(input: string, gameId: string): Promise<PlayerStats> {
    const key = apiKeys.get('steam');
    const steamId = await getSteamId(input);
    const appId = STEAM_APP_IDS[gameId];

    // Get player summary
    const summaryData = await fetchSteam<any>(`/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`);
    const profile = summaryData.response?.players?.[0];
    if (!profile) throw new Error('Steam player not found. Make sure the profile is public.');

    // Get game stats (if appId is known)
    let gameStats: any = null;
    let recentMatchData: any = null;

    if (appId) {
        [gameStats, recentMatchData] = await Promise.all([
            fetchSteam<any>(`/ISteamUserStats/GetUserStatsForGame/v2/?appid=${appId}&key=${key}&steamid=${steamId}`)
                .catch(() => null),
            fetchSteam<any>(`/IPlayerService/GetRecentlyPlayedGames/v1/?key=${key}&steamid=${steamId}&count=10`)
                .catch(() => null),
        ]);
    }

    // Parse stats from the raw stats array
    const stats: Record<string, number> = {};
    if (gameStats?.playerstats?.stats) {
        for (const s of gameStats.playerstats.stats) {
            stats[s.name] = s.value;
        }
    }

    // Extract generic K/D/W from various stat name conventions
    const kills =
        stats['total_kills'] ?? stats['kills'] ?? stats['Kills'] ??
            stats['MATCHMAKING_WINS'] ? undefined : undefined ?? 0;

    const deaths =
        stats['total_deaths'] ?? stats['deaths'] ?? stats['Deaths'] ?? 0;

    const wins =
        stats['total_wins'] ?? stats['wins'] ?? stats['Wins'] ??
        stats['solo_vs_squad_wins'] ?? 0;

    const losses =
        stats['total_losses'] ?? stats['losses'] ?? stats['Losses'] ??
            stats['total_matches_played'] ? (stats['total_matches_played'] - wins) : 0;

    const totalMatches = wins + losses || stats['total_matches_played'] || 0;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 50;
    const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;

    // Hours played from owned games
    const ownedData = await fetchSteam<any>(`/IPlayerService/GetOwnedGames/v1/?key=${key}&steamid=${steamId}&include_appinfo=false&appids_filter[0]=${appId || 0}`)
        .catch(() => null);
    const gameEntry = ownedData?.response?.games?.find((g: any) => g.appid === appId);
    const hoursPlayed = gameEntry ? Math.round(gameEntry.playtime_forever / 60) : 0;

    // Build placeholder match history
    const recentMatches: Match[] = Array.from({ length: 5 }, (_, i) => ({
        id: `match-${i}`,
        mode: 'Match',
        result: i % 2 === 0 ? 'win' : 'loss',
        kills: Math.round(kills / Math.max(totalMatches, 1)),
        deaths: Math.round(deaths / Math.max(totalMatches, 1)),
        assists: 0,
        score: 0,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: 'N/A',
    }));

    const performanceData: PerformancePoint[] = recentMatches.map(m => ({
        date: m.date,
        winRate,
        kd,
    })).reverse();

    return {
        username: profile.personaname,
        rank: hoursPlayed > 0 ? `${hoursPlayed}h played` : 'Steam Player',
        rankIcon: '🎮',
        winRate,
        kd,
        totalMatches,
        hoursPlayed,
        level: profile.commentpermission ?? 1,
        recentMatches,
        performanceData,
    };
}
