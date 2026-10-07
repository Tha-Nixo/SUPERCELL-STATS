import type { GameTheme } from '../../data/games';
import type { PlayerStats } from '../../data/mockStats';

/** Props every per-game page module receives from GamePage. */
export interface GameModuleProps {
  game: GameTheme;
  playerStats: PlayerStats;
  /** Selected section id, already validated against GAME_TABS (pages/game/tabs.tsx). */
  tab: string;
  /** The player's tag as shown in the hero ('#PYLQGRJC'). */
  playerTag: string;
  /** Switch section from inside the content (e.g. "All battles"). Pushes a history entry. */
  onTabChange: (id: string) => void;
}
