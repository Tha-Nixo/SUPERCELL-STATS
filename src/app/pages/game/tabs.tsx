import { Activity, Award, BarChart2, Castle, Flame, Hammer, Layers, Shield, Swords, Users } from 'lucide-react';
import { bsOverviewFacts } from '../../components/bsFacts';
import type { PlayerStats } from '../../data/mockStats';
import type { TabDef } from '../../ui/SectionTabs';
import type { GameId } from './modules';

/**
 * Player-page sections per game. The ids are public: they appear in links as
 * ?tab=<id>, so never rename one. The first tab is the default.
 */
export const GAME_TABS = {
  'clash-royale': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'cards', label: 'Cards', icon: <Layers /> },
    { id: 'deck', label: 'Deck', icon: <Shield /> },
    { id: 'battles', label: 'Battles', icon: <Swords /> },
    { id: 'towers', label: 'Tower troops', icon: <Flame /> },
  ],
  'brawl-stars': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'brawlers', label: 'Brawlers', icon: <Users /> },
    { id: 'progression', label: 'Progression', icon: <BarChart2 /> },
    { id: 'battles', label: 'Battles', icon: <Swords /> },
    { id: 'club', label: 'Club', icon: <Shield /> },
  ],
  'clash-of-clans': [
    { id: 'overview', label: 'Overview', icon: <Activity /> },
    { id: 'army', label: 'Army', icon: <Hammer /> },
    { id: 'heroes', label: 'Heroes and equipment', icon: <Castle /> },
    { id: 'achievements', label: 'Achievements', icon: <Award /> },
  ],
} as const satisfies Record<GameId, readonly TabDef[]>;

/** The section ids of one game, as a union ('overview' | 'cards' | ...). */
export type TabId<G extends GameId> = (typeof GAME_TABS)[G][number]['id'];

/**
 * Small counts shown next to a tab label, computed from the loaded player.
 * Clash Royale Cards: "found / in game" from the API mapper ("12 / 123", or
 * just "12" when the card catalogue could not be fetched). Brawl Stars
 * Brawlers: "unlocked / in game" the same way.
 */
export function tabCounts(game: GameId, stats: PlayerStats): Partial<Record<string, string>> {
  if (game === 'brawl-stars') {
    const unlocked = stats.gameVisuals?.bs?.allBrawlers.length;
    if (!unlocked) return {};
    const inGame = bsOverviewFacts(stats).brawlersInGame;
    return { brawlers: inGame ? `${unlocked}/${inGame}` : String(unlocked) };
  }
  if (game !== 'clash-royale') return {};
  const found = stats.extraStats?.find((s) => s.label === 'Cards Found')?.value;
  return found === undefined || found === '' ? {} : { cards: String(found).replace(/\s+/g, '') };
}
