import { bsBattleRows } from '../../components/bsFacts';
import type { BattleRow } from '../../components/MatchHistory';
import type { PlayerStats } from '../../data/mockStats';
import type { GameId } from './modules';

/**
 * The battles a game's Battles tab lists and filters. The shell uses the same
 * list to decide which filters a shared link may keep, so both always agree.
 * Clash Royale: the mapper's matches (every battle the API returned, up to 30).
 * Brawl Stars: the mapper's battle log (up to 25), which keeps map and placement.
 */
export function battleRowsOf(game: GameId, stats: PlayerStats): BattleRow[] {
  if (game === 'clash-royale') return stats.recentMatches;
  if (game === 'brawl-stars') return bsBattleRows(stats.gameVisuals?.bs?.battlelog);
  return [];
}
