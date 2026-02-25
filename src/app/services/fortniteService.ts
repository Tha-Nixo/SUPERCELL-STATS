import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

export async function searchFortnitePlayer(username: string): Promise<PlayerStats> {
    const key = apiKeys.get('fortnite');

    // Get player stats
    const res = await fetch(`/api/fortnite/v1/stats?name=${encodeURIComponent(username)}`, {
        headers: { Authorization: key },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err?.error ?? `HTTP ${res.status}: Player not found`);
    }
    const data = await res.json();

    // fortniteapi.io response structure
    const globalStats = data.global_stats ?? {};
    const squad = globalStats.squad ?? globalStats.solo ?? {};
    const solo = globalStats.solo ?? {};
    const overall = globalStats.overall ?? {};

    const wins = (squad.placetop1 ?? 0) + (solo.placetop1 ?? 0);
    const matches = overall.matchesplayed ?? squad.matchesplayed ?? solo.matchesplayed ?? 0;
    const kills = overall.kills ?? squad.kills ?? solo.kills ?? 0;
    const deaths = matches - wins;
    const winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
    const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;
    const score = overall.score ?? squad.score ?? solo.score ?? 0;
    const minutesPlayed = overall.minutesplayed ?? matches * 20;

    const recentMatches: Match[] = Array.from({ length: 5 }, (_, i) => ({
        id: `match-${i}`,
        mode: i % 2 === 0 ? 'Squad' : 'Solo',
        result: i < wins % 5 ? 'win' : 'loss',
        kills: Math.round(kills / Math.max(matches, 1)),
        deaths: 1,
        assists: 0,
        score: Math.round(score / Math.max(matches, 1)),
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: '~20m',
    }));

    const performanceData: PerformancePoint[] = recentMatches.map(m => ({
        date: m.date, winRate, kd,
    })).reverse();

    return {
        username: data.name ?? username,
        rank: winRate > 15 ? 'Champion' : winRate > 8 ? 'Elite' : 'Contender',
        rankIcon: winRate > 15 ? '🏆' : winRate > 8 ? '🌟' : '⭐',
        winRate,
        kd,
        totalMatches: matches,
        hoursPlayed: Math.round(minutesPlayed / 60),
        level: data.level ?? 1,
        recentMatches,
        performanceData,
    };
}
