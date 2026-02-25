import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

type ApexPlatform = 'PC' | 'PS4' | 'X1';

function detectPlatform(input: string): { name: string; platform: ApexPlatform } {
    const parts = input.split(':');
    const name = parts[0].trim();
    const raw = parts[1]?.trim().toUpperCase() ?? 'PC';
    const platform: ApexPlatform = (['PC', 'PS4', 'X1'] as ApexPlatform[]).includes(raw as ApexPlatform)
        ? (raw as ApexPlatform) : 'PC';
    return { name, platform };
}

interface ApexPlayerData {
    global: {
        name: string;
        level: number;
        rank: { rankName: string; rankImg: string; rankPos: number };
        legend_name: string;
    };
    total?: {
        kills?: { value: number };
        wins?: { value: number };
        games_played?: { value: number };
        damage?: { value: number };
    };
    legends?: {
        selected?: {
            LegendName: string;
            data?: Array<{ name: string; value: number }>;
        };
    };
}

const APEX_RANK_ICONS: Record<string, string> = {
    Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎',
    Diamond: '💠', Master: '👑', Apex: '✨', Rookie: '🔩',
};

export async function searchApexPlayer(input: string): Promise<PlayerStats> {
    const { name, platform } = detectPlatform(input);
    const key = apiKeys.get('apex');

    const res = await fetch(`/api/apex/bridge?auth=${key}&player=${encodeURIComponent(name)}&platform=${platform}&merge=true&removeDuplicates=true`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({ Error: res.statusText }));
        throw new Error(err?.Error ?? `HTTP ${res.status}`);
    }
    const data: ApexPlayerData = await res.json();

    const kills = data.total?.kills?.value ?? 0;
    const wins = data.total?.wins?.value ?? 0;
    const gamesPlayed = data.total?.games_played?.value ?? 0;
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 50;
    const deaths = gamesPlayed - wins;
    const kd = deaths > 0 ? Math.round((kills / deaths) * 100) / 100 : kills;

    const rankName = data.global?.rank?.rankName ?? 'Unranked';
    const rankIcon = APEX_RANK_ICONS[rankName] ?? '❓';

    const recentMatches: Match[] = Array.from({ length: 5 }, (_, i) => ({
        id: `match-${i}`,
        mode: 'Battle Royale',
        result: i < wins % 5 ? 'win' : 'loss',
        kills: Math.round(kills / Math.max(gamesPlayed, 1)),
        deaths: 1,
        assists: 0,
        score: data.total?.damage?.value ? Math.round(data.total.damage.value / Math.max(gamesPlayed, 1)) : 0,
        date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        duration: '~20m',
    }));

    const performanceData: PerformancePoint[] = recentMatches.map(m => ({
        date: m.date, winRate, kd,
    })).reverse();

    return {
        username: data.global?.name ?? name,
        rank: rankName,
        rankIcon,
        winRate,
        kd,
        totalMatches: gamesPlayed,
        hoursPlayed: Math.round(gamesPlayed * 0.35),
        level: data.global?.level ?? 1,
        recentMatches,
        performanceData,
    };
}
