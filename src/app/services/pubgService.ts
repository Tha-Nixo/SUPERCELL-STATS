import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

type PubgPlatform = 'steam' | 'psn' | 'xbox' | 'kakao' | 'stadia';

function detectPlatform(input: string): { name: string; platform: PubgPlatform } {
    // Allow "name:platform" format, default to steam
    const parts = input.split(':');
    const name = parts[0].trim();
    const raw = (parts[1]?.trim().toLowerCase() ?? 'steam') as PubgPlatform;
    const validPlatforms: PubgPlatform[] = ['steam', 'psn', 'xbox', 'kakao', 'stadia'];
    const platform = validPlatforms.includes(raw) ? raw : 'steam';
    return { name, platform };
}

async function fetchPubg<T>(path: string): Promise<T> {
    const key = apiKeys.get('pubg');
    const res = await fetch(`/api/pubg${path}`, {
        headers: {
            Authorization: `Bearer ${key}`,
            Accept: 'application/vnd.api+json',
        },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        const msg = err?.errors?.[0]?.title ?? err.message ?? `HTTP ${res.status}`;
        throw new Error(msg);
    }
    return res.json() as Promise<T>;
}

export async function searchPubgPlayer(input: string): Promise<PlayerStats> {
    const { name, platform } = detectPlatform(input);

    // Get player data
    const playersData = await fetchPubg<any>(`/shards/${platform}/players?filter[playerNames]=${encodeURIComponent(name)}`);
    const player = playersData?.data?.[0];
    if (!player) throw new Error('PUBG player not found. Check the username and platform (e.g. "PlayerName:steam").');

    const playerId = player.id;
    const matchIds: string[] = (player.relationships?.matches?.data ?? []).slice(0, 10).map((m: any) => m.id);

    // Get season stats
    const seasonsData = await fetchPubg<any>(`/shards/${platform}/seasons?filter[isCurrentSeason]=true`).catch(() => null);
    const seasonId = seasonsData?.data?.[0]?.id;

    let winRate = 50;
    let kd = 1.0;
    let totalMatches = 0;
    let hoursPlayed = 0;

    if (seasonId) {
        const statsData = await fetchPubg<any>(`/shards/${platform}/players/${playerId}/seasons/${seasonId}`).catch(() => null);
        const rankedStats = statsData?.data?.attributes?.rankedGameModeStats?.squad ??
            statsData?.data?.attributes?.gameModeStats?.squad ??
            statsData?.data?.attributes?.gameModeStats?.solo ?? {};
        const kills = rankedStats.kills ?? 0;
        const deaths = rankedStats.losses ?? rankedStats.roundsPlayed ?? 1;
        const wins = rankedStats.wins ?? 0;
        totalMatches = rankedStats.roundsPlayed ?? 0;
        winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 50;
        kd = kills / Math.max(deaths, 1);
        hoursPlayed = Math.round((rankedStats.timeSurvived ?? 0) / 3600);
    }

    // Fetch a few match summaries
    const recentMatches: Match[] = await Promise.allSettled(
        matchIds.slice(0, 5).map(id => fetchPubg<any>(`/shards/${platform}/matches/${id}`))
    ).then(results =>
        results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r, i) => {
                const m = r.value;
                const participants: any[] = m.included?.filter((x: any) => x.type === 'participant') ?? [];
                const me = participants.find(p => p.attributes?.stats?.name?.toLowerCase() === name.toLowerCase())
                    ?? participants[0];
                const s = me?.attributes?.stats ?? {};
                return {
                    id: `match-${i}`,
                    mode: m.data?.attributes?.gameMode ?? 'Squad',
                    result: (s.winPlace === 1 ? 'win' : 'loss') as 'win' | 'loss' | 'draw',
                    kills: s.kills ?? 0,
                    deaths: s.deathType === 'alive' ? 0 : 1,
                    assists: s.assists ?? 0,
                    score: s.damageDealt ? Math.round(s.damageDealt) : 0,
                    date: m.data?.attributes?.createdAt
                        ? new Date(m.data.attributes.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'N/A',
                    duration: s.timeSurvived ? `${Math.round(s.timeSurvived / 60)}m` : 'N/A',
                };
            })
    );

    const performanceData: PerformancePoint[] = recentMatches.map(m => ({
        date: m.date,
        winRate: m.result === 'win' ? 100 : 0,
        kd: m.deaths > 0 ? m.kills / m.deaths : m.kills,
    })).reverse();

    return {
        username: name,
        rank: winRate > 60 ? 'Platinum' : winRate > 45 ? 'Gold' : 'Silver',
        rankIcon: winRate > 60 ? '💎' : winRate > 45 ? '🥇' : '🥈',
        winRate,
        kd: Math.round(kd * 100) / 100,
        totalMatches,
        hoursPlayed,
        level: 1,
        recentMatches,
        performanceData,
    };
}
