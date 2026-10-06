import { lazy } from 'react';

/**
 * One lazily loaded module per game: a player page downloads only its own
 * game's components. Keys are the route's :gameId values.
 */
export const GAME_MODULES = {
  'clash-royale': lazy(() => import('./ClashRoyale')),
  'brawl-stars': lazy(() => import('./BrawlStars')),
  'clash-of-clans': lazy(() => import('./ClashOfClans')),
} as const;

export type GameId = keyof typeof GAME_MODULES;

export function isGameId(id: string): id is GameId {
  return id in GAME_MODULES;
}
