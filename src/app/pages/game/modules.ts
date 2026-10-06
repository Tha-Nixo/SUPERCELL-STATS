import { lazy } from 'react';

/** One dynamic import per game, so each game's components form their own chunk. */
const LOADERS = {
  'clash-royale': () => import('./ClashRoyale'),
  'brawl-stars': () => import('./BrawlStars'),
  'clash-of-clans': () => import('./ClashOfClans'),
} as const;

/**
 * One lazily loaded module per game: a player page downloads only its own
 * game's components. Keys are the route's :gameId values.
 */
export const GAME_MODULES = {
  'clash-royale': lazy(LOADERS['clash-royale']),
  'brawl-stars': lazy(LOADERS['brawl-stars']),
  'clash-of-clans': lazy(LOADERS['clash-of-clans']),
} as const;

export type GameId = keyof typeof GAME_MODULES;

export function isGameId(id: string): id is GameId {
  return id in GAME_MODULES;
}

/** Warm the browser's module cache; a failure surfaces later, where the module renders. */
export function preloadGameModule(id: GameId): void {
  LOADERS[id]().catch(() => {});
}
