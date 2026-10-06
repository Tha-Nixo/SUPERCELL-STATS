import { Activity, Award, BarChart2, Castle, Flame, Hammer, Layers, Shield, Swords, Users } from 'lucide-react';
import type { TabDef } from '../../ui/SectionTabs';
import type { GameId } from './modules';

/**
 * Player-page sections per game. The ids are public: they appear in links as
 * ?tab=<id>, so never rename one. The first tab is the default.
 */
export const GAME_TABS: Record<GameId, readonly TabDef[]> = {
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
};
