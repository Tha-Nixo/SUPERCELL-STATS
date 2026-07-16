/// <reference types="vite/client" />
// API keys — Supercell only.
//
// Two operating modes:
//  - Local dev: keys live in .env as VITE_* and travel from the browser
//    through the Vite dev proxy (localhost only — never deploy like this).
//  - Production: the client sends NO key at all; the reverse proxy in front
//    of the site (Caddy) injects the Authorization header server-side.
//    See DEPLOY.md.
//
// VITE_DEMO_MODE=true forces mock data regardless of keys.
export type ApiKeyName = 'clashRoyale' | 'brawlStars' | 'clashOfClans';

const ENV_MAP: Record<ApiKeyName, string> = {
    clashRoyale: import.meta.env.VITE_CLASH_ROYALE_API_KEY ?? '',
    brawlStars: import.meta.env.VITE_BRAWL_STARS_API_KEY ?? '',
    clashOfClans: import.meta.env.VITE_CLASH_OF_CLANS_API_KEY ?? '',
};

export const DEMO_MODE = String(import.meta.env.VITE_DEMO_MODE ?? '') === 'true';

export const apiKeys = {
    get(key: ApiKeyName): string {
        return ENV_MAP[key] ?? '';
    },
    has(key: ApiKeyName): boolean {
        return !!(ENV_MAP[key]?.trim());
    },
};
