import { Award } from 'lucide-react';
import { CoCAchievements } from '../../components/CoCAchievements';
import { CoCArmyDisplay } from '../../components/CoCArmyDisplay';
import { CoCHeroes } from '../../components/CoCHeroes';
import { CoCOverview } from '../../components/CoCOverview';
import { EmptyState } from '../../ui/EmptyState';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type CoCTab = TabId<'clash-of-clans'>;

/** Clash of Clans sections: overview | army | heroes | achievements. */
export default function ClashOfClans({ game, playerStats, tab }: GameModuleProps) {
  const coc = playerStats.gameVisuals?.coc;
  if (!coc) {
    return (
      <EmptyState icon={<Award />} title="No Clash of Clans profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as CoCTab) {
    case 'army':
      return <CoCArmyDisplay coc={coc} />;
    case 'heroes':
      return <CoCHeroes heroes={coc.heroes} equipment={coc.heroEquipment ?? []} />;
    case 'achievements':
      return coc.achievements && coc.achievements.length > 0 ? (
        <CoCAchievements achievements={coc.achievements} accent={game.accent} />
      ) : (
        <EmptyState icon={<Award />} title="No achievements in this answer">
          The API sent no achievement progress for this player.
        </EmptyState>
      );
    default:
      return <CoCOverview playerStats={playerStats} />;
  }
}
