import { apiKeys, ApiKeyName } from './apiKeys';
import { PlayerStats } from '../data/mockStats';
import { generatePlayerStats } from '../data/mockStats';
import { searchSupercellPlayer } from './supercellService';

export interface SearchResult {
    data: PlayerStats | null;
    isReal: boolean;
    error: string | null;
}

// Maps each Supercell game to its API key and handler
const GAME_CONFIG: Record<string, {
    keyName: ApiKeyName;
    handler: (input: string, gameId: string) => Promise<PlayerStats>;
}> = {
    'clash-royale': { keyName: 'clashRoyale', handler: (i, g) => searchSupercellPlayer(i, g as any) },
    'brawl-stars': { keyName: 'brawlStars', handler: (i, g) => searchSupercellPlayer(i, g as any) },
    'clash-of-clans': { keyName: 'clashOfClans', handler: (i, g) => searchSupercellPlayer(i, g as any) },
};

export async function searchPlayer(gameId: string, input: string): Promise<SearchResult> {
    const config = GAME_CONFIG[gameId];

    // No config → mock
    if (!config) {
        return { data: generatePlayerStats(input, gameId), isReal: false, error: null };
    }

    // Key missing → mock silently
    if (!apiKeys.has(config.keyName)) {
        return { data: generatePlayerStats(input, gameId), isReal: false, error: null };
    }

    // Call real API
    try {
        const data = await config.handler(input, gameId);
        return { data, isReal: true, error: null };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (message.includes('inMaintenance')) {
            return { data: null, isReal: false, error: 'The game servers are currently in maintenance. Please try again later.' };
        }
        return { data: null, isReal: false, error: message };
    }
}
