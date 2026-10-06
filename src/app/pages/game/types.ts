import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';

/** Props every per-game page module receives from GamePage. */
export interface GameModuleProps {
  game: GameTheme;
  playerStats: PlayerStats;
}
