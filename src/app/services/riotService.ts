import { apiKeys } from './apiKeys';
import { PlayerStats, Match, PerformancePoint } from '../data/mockStats';

// Riot regional routing: EU → europe, NA → americas, Asia → asia
export type RiotRegion = 'europe' | 'americas' | 'asia';
export type RiotPlatform = 'euw1' | 'eun1' | 'tr1' | 'ru' | 'na1' | 'br1' | 'la1' | 'la2' | 'jp1' | 'kr' | 'oc1' | 'ph2' | 'sg2' | 'th2' | 'tw2' | 'vn2';

const PLATFORMS: Record<string, { platform: RiotPlatform; region: RiotRegion }> = {
    euw: { platform: 'euw1', region: 'europe' },
    eune: { platform: 'eun1', region: 'europe' },
    tr: { platform: 'tr1', region: 'europe' },
    ru: { platform: 'ru', region: 'europe' },
    na: { platform: 'na1', region: 'americas' },
    br: { platform: 'br1', region: 'americas' },
    lan: { platform: 'la1', region: 'americas' },
    las: { platform: 'la2', region: 'americas' },
    jp: { platform: 'jp1', region: 'asia' },
    kr: { platform: 'kr', region: 'asia' },
    oce: { platform: 'oc1', region: 'asia' },
};

function proxyBase(region: RiotRegion): string {
    if (region === 'americas') return '/api/riot-na';
    if (region === 'asia') return '/api/riot-asia';
    return '/api/riot';
}

interface RiotAccount { puuid: string; gameName: string; tagLine: string; }
interface SummonerDTO { id: string; accountId: string; puuid: string; profileIconId: number; summonerLevel: number; }
interface LeagueEntryDTO { tier: string; rank: string; wins: number; losses: number; leaguePoints: number; }

async function fetchRiot<T>(url: string): Promise<T> {
    const key = apiKeys.get('riot');
    const res = await fetch(url, { headers: { 'X-Riot-Token': key } });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(err?.status?.message ?? err.message ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
}

function parseRiotId(input: string): { gameName: string; tagLine: string; platform: RiotPlatform; region: RiotRegion } {
    // Format: GameName#TAG  or  GameName#TAG-REGION (e.g. Player#EUW  or  Player#1234)
    const parts = input.split('#');
    const gameName = parts[0].trim();
    const rawTag = parts[1]?.trim() ?? 'EUW';
    // Try to detect region from tag (e.g. EUW, NA, KR...)
    const tagUpper = rawTag.toUpperCase();
    const detected = Object.entries(PLATFORMS).find(([key]) => tagUpper.startsWith(key.toUpperCase()));
    const { platform, region } = detected ? detected[1] : PLATFORMS['euw'];
    // Tag is just the raw tag without region suffix for API purposes
    return { gameName, tagLine: rawTag, platform, region };
}

const TIER_RANK: Record<string, string> = { IRON: '🔩', BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇', PLATINUM: '💎', EMERALD: '💚', DIAMOND: '💠', MASTER: '👑', GRANDMASTER: '⚜️', CHALLENGER: '✨' };

export async function searchRiotPlayer(input: string, gameId: string): Promise<PlayerStats> {
    const { gameName, tagLine, platform, region } = parseRiotId(input);
    const base = proxyBase(region);

    // 1. Get PUUID via account-v1
    const account = await fetchRiot<RiotAccount>(`${base}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);

    // 2. Get Summoner info (LoL/TFT specific)
    let summonerLevel = 1;
    let rankLabel = 'Unranked';
    let rankIcon = '❓';
    let winRate = 50;
    let kd = 1.0;
    let totalMatches = 0;

    if (gameId === 'league-of-legends' || gameId === 'teamfight-tactics') {
        try {
            const summoner = await fetchRiot<SummonerDTO>(`/api/riot-platform-${platform}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`.replace('riot-platform-', '')).catch(() => null);
            // Use platform-specific proxy — simpler: call directly with the platform subdomain
            const platformBase = `/api/riot-${platform}`;
            const summ = await fetch(`${platformBase}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`, {
                headers: { 'X-Riot-Token': apiKeys.get('riot') }
            });
            if (summ.ok) {
                const s: SummonerDTO = await summ.json();
                summonerLevel = s.summonerLevel;

                // League entries
                const leagueRes = await fetch(`${platformBase}/lol/league/v4/entries/by-summoner/${s.id}`, {
                    headers: { 'X-Riot-Token': apiKeys.get('riot') }
                });
                if (leagueRes.ok) {
                    const entries: LeagueEntryDTO[] = await leagueRes.json();
                    const soloQ = entries.find(e => e.tier) ?? entries[0];
                    if (soloQ) {
                        rankLabel = `${soloQ.tier} ${soloQ.rank}`;
                        rankIcon = TIER_RANK[soloQ.tier] ?? '❓';
                        const total = soloQ.wins + soloQ.losses;
                        winRate = total > 0 ? Math.round((soloQ.wins / total) * 100) : 50;
                        totalMatches = total;
                    }
                }
            }
        } catch { /* fallback */ }

        // Match history (last 10)
        const matchIds = await fetchRiot<string[]>(`${base}/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=10`);
        const matches = await Promise.allSettled(
            matchIds.slice(0, 10).map(id => fetchRiot<any>(`${base}/lol/match/v5/matches/${id}`))
        );

        const parsedMatches: Match[] = matches
            .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
            .map((r, i) => {
                const m = r.value;
                const me = m.info.participants.find((p: any) => p.puuid === account.puuid) ?? m.info.participants[0];
                return {
                    id: `match-${i}`,
                    mode: m.info.gameMode ?? 'Ranked',
                    result: (me.win ? 'win' : 'loss') as 'win' | 'loss' | 'draw',
                    kills: me.kills ?? 0,
                    deaths: me.deaths ?? 0,
                    assists: me.assists ?? 0,
                    score: me.totalMinionsKilled ?? 0,
                    date: new Date(m.info.gameCreation).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    duration: `${Math.round(m.info.gameDuration / 60)}m`,
                };
            });

        if (parsedMatches.length > 0) {
            const wins = parsedMatches.filter(m => m.result === 'win').length;
            winRate = Math.round((wins / parsedMatches.length) * 100);
            const totalK = parsedMatches.reduce((s, m) => s + m.kills, 0);
            const totalD = parsedMatches.reduce((s, m) => s + m.deaths, 0);
            kd = totalD > 0 ? Math.round((totalK / totalD) * 100) / 100 : totalK;
            totalMatches = totalMatches || parsedMatches.length;
        }

        const performanceData: PerformancePoint[] = parsedMatches.map((m, i) => ({
            date: m.date,
            winRate: m.result === 'win' ? 100 : 0,
            kd: m.deaths > 0 ? Math.round((m.kills / m.deaths) * 100) / 100 : m.kills,
        })).reverse();

        return {
            username: `${account.gameName}#${account.tagLine}`,
            rank: rankLabel,
            rankIcon,
            winRate,
            kd,
            totalMatches,
            hoursPlayed: Math.round(totalMatches * 0.6),
            level: summonerLevel,
            recentMatches: parsedMatches,
            performanceData,
        };
    }

    // Valorant match history
    const valMatchIds = await fetchRiot<string[]>(`${base}/val/match/v1/matchlists/by-puuid/${account.puuid}`)
        .then((r: any) => r.history?.map((h: any) => h.matchId) ?? [])
        .catch(() => []);

    const valMatches = await Promise.allSettled(
        valMatchIds.slice(0, 10).map((id: string) => fetchRiot<any>(`${base}/val/match/v1/matches/${id}`))
    );

    const parsedVal: Match[] = valMatches
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r, i) => {
            const m = r.value;
            const me = m.players?.find((p: any) => p.puuid === account.puuid) ?? m.players?.[0] ?? {};
            const stats = me.stats ?? {};
            return {
                id: `match-${i}`,
                mode: m.matchInfo?.queueId ?? 'Competitive',
                result: (me.teamId === m.teams?.find((t: any) => t.won)?.teamId ? 'win' : 'loss') as 'win' | 'loss' | 'draw',
                kills: stats.kills ?? 0,
                deaths: stats.deaths ?? 0,
                assists: stats.assists ?? 0,
                score: stats.score ?? 0,
                date: new Date(m.matchInfo?.gameStartMillis ?? Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                duration: `${Math.round((m.matchInfo?.gameLengthMillis ?? 0) / 60000)}m`,
            };
        });

    const wins = parsedVal.filter(m => m.result === 'win').length;
    const vWinRate = parsedVal.length > 0 ? Math.round((wins / parsedVal.length) * 100) : 50;
    const totalK = parsedVal.reduce((s, m) => s + m.kills, 0);
    const totalD = parsedVal.reduce((s, m) => s + m.deaths, 0);
    const vKd = totalD > 0 ? Math.round((totalK / totalD) * 100) / 100 : totalK;

    return {
        username: `${account.gameName}#${account.tagLine}`,
        rank: 'See Valorant Tracker',
        rankIcon: '🎯',
        winRate: vWinRate,
        kd: vKd,
        totalMatches: parsedVal.length,
        hoursPlayed: parsedVal.length * 0.7,
        level: 1,
        recentMatches: parsedVal,
        performanceData: parsedVal.map(m => ({
            date: m.date,
            winRate: m.result === 'win' ? 100 : 0,
            kd: m.deaths > 0 ? Math.round((m.kills / m.deaths) * 100) / 100 : m.kills,
        })).reverse(),
    };
}
