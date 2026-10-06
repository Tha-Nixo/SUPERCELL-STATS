import { PlayerStats } from '../data/mockStats';

export interface RecentSearch {
    gameId: string;
    tag: string;         // We must capture the tag we used to search
    username: string;
    thLevel?: number;    // specific to CoC
    trophies: number;
    leagueUrl?: string;
    clanName?: string;
    timestamp: number;
}

const STORAGE_KEY = 'supercell_recent_searches';
const MAX_HISTORY = 10;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const optional = (v: unknown, ok: (x: unknown) => boolean) => v === undefined || v === null || ok(v);

function isRecentSearch(v: unknown): v is RecentSearch {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
    const e = v as Record<string, unknown>;
    return isStr(e.gameId) && isStr(e.tag) && isStr(e.username) && isNum(e.trophies) && isNum(e.timestamp)
        && optional(e.thLevel, isNum) && optional(e.leagueUrl, isStr) && optional(e.clanName, isStr);
}

/** Stored data is untrusted: anything that is not a well-formed entry is dropped, and this never throws. */
export function getRecentSearches(gameId?: string): RecentSearch[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const valid = parsed.filter(isRecentSearch);
        return gameId ? valid.filter(p => p.gameId === gameId) : valid;
    } catch {
        return [];
    }
}

export function saveRecentSearch(gameId: string, tag: string, stats: PlayerStats) {
    try {
        const list = getRecentSearches();

        // Remove duplicates of the same player tag within the same game
        const filteredList = list.filter(item => !(item.gameId === gameId && item.tag === tag));

        // Numeric trophies come straight from the service; no string re-parsing.
        const trophies = stats.trophies ?? 0;
        let thLevel = undefined;
        let clanName = undefined;
        let leagueUrl = undefined;

        if (gameId === 'clash-of-clans') {
            const coc = stats.gameVisuals?.coc;
            if (coc) {
                thLevel = coc.townHallLevel;
                clanName = coc.clanName;
                leagueUrl = coc.leagueBadgeUrl;
            }
        }

        const newEntry: RecentSearch = {
            gameId,
            tag,
            username: stats.username,
            thLevel,
            trophies,
            leagueUrl,
            clanName,
            timestamp: Date.now()
        };

        filteredList.unshift(newEntry);

        // Trim per game, not globally: with one shared cap, ten Clash Royale
        // searches used to evict every Brawl Stars and Clash of Clans entry.
        const perGame = new Map<string, number>();
        const trimmed = filteredList.filter((item) => {
            const seen = (perGame.get(item.gameId) ?? 0) + 1;
            perGame.set(item.gameId, seen);
            return seen <= MAX_HISTORY;
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
        console.warn("Failed to save recent search", e);
    }
}

export function removeRecentSearch(gameId: string, tag: string) {
    try {
        const list = getRecentSearches();
        const filteredList = list.filter(item => !(item.gameId === gameId && item.tag === tag));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredList));
    } catch {
        /* storage unavailable (private mode / quota): nothing to remove */
    }
}
