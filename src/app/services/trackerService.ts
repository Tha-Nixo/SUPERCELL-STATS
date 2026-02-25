import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

// Tracker.gg game slugs
const TRACKER_GAME_SLUGS: Record<string, string> = {
    'rocket-league': 'rocket-league',
    'warframe': 'warframe',
    'hearthstone': 'hearthstone',
    'the-finals': 'the-finals',
    'fall-guys': 'fall-guys',
    'path-of-exile-2': 'path-of-exile-2',
    'lost-ark': 'lost-ark',
    'apex-legends': 'apex',
};

interface TRNSegment {
    metadata: { name: string };
    stats: Record<string, { displayValue: string; value: number }>;
}

export async function searchTrackerPlayer(username: string, gameId: string): Promise<PlayerStats> {
    const key = apiKeys.get('tracker');
    const slug = TRACKER_GAME_SLUGS[gameId] ?? gameId;

    const res = await fetch(`/api/tracker/api/v2/${slug}/standard/profile/ign/${encodeURIComponent(username)}`, {
        headers: {
            'TRN-Api-Key': key,
            'Accept': 'application/json',
        },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.errors?.[0]?.message ?? err.message ?? `HTTP ${res.status}: Player not found`);
    }

    const data = await res.json();
    const segments: TRNSegment[] = data.data?.segments ?? [];
    const overview = segments.find(s => s.metadata?.name === 'Overview') ?? segments[0];
    const stats = overview?.stats ?? {};

    const winRate = Math.round(stats['winPercentage']?.value ?? stats['winRate']?.value ?? 50);
    const kd = Math.round((stats['kd']?.value ?? stats['killDeathRatio']?.value ?? 1.0) * 100) / 100;
    const wins = Math.round(stats['wins']?.value ?? 0);
    const losses = Math.round(stats['losses']?.value ?? 0);
    const totalMatches = wins + losses || Math.round(stats['matchesPlayed']?.value ?? 0);
    const level = Math.round(stats['level']?.value ?? stats['rank']?.value ?? 1);

    // Rank info
    const rankName = stats['tier']?.displayValue ?? stats['rank']?.displayValue ?? stats['mmr']?.displayValue ?? 'Unranked';

    const rankIcons: Record<string, string> = {
        Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎',
        Diamond: '💠', Champion: '👑', Grand: '✨', Unranked: '❓',
        Supersonic: '🚀', Radiant: '✨', Master: '👑',
    };
    const rankIcon = Object.entries(rankIcons).find(([k]) => rankName.includes(k))?.[1] ?? '🎮';

    const recentMatches: Match[] = Array.from({ length: 5 }, (_, i) => ({
        id: `match-${i}`,
        mode: 'Ranked',
        result: i < (wins % 5) ? 'win' : 'loss',
        kills: Math.round((stats['kills']?.value ?? kd) / Math.max(totalMatches, 1)),
        deaths: 1,
        assists: 0,
        score: 0,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: 'N/A',
    }));

    const performanceData: PerformancePoint[] = recentMatches.map(m => ({
        date: m.date, winRate, kd,
    })).reverse();

    return {
        username: data.data?.platformInfo?.platformUserHandle ?? username,
        rank: rankName,
        rankIcon,
        winRate,
        kd,
        totalMatches,
        hoursPlayed: Math.round(stats['timePlayed']?.value ?? totalMatches * 0.5),
        level,
        recentMatches,
        performanceData,
    };
}
