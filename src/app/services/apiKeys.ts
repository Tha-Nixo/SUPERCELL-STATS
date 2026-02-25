/// <reference types="vite/client" />
// API keys — Supercell only
export type ApiKeyName = 'clashRoyale' | 'brawlStars' | 'clashOfClans';

const ENV_MAP: Record<ApiKeyName, string> = {
    clashRoyale: import.meta.env.VITE_CLASH_ROYALE_API_KEY ?? '',
    brawlStars: import.meta.env.VITE_BRAWL_STARS_API_KEY ?? '',
    clashOfClans: import.meta.env.VITE_CLASH_OF_CLANS_API_KEY ?? '',
};

export const apiKeys = {
    get(key: ApiKeyName): string {
        return ENV_MAP[key] ?? '';
    },
    has(key: ApiKeyName): boolean {
        return !!(ENV_MAP[key]?.trim());
    },
};
