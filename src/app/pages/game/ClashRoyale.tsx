import { Swords } from 'lucide-react';
import { CRCardsList } from '../../components/CRCardsList';
import { CRDeck } from '../../components/CRDeck';
import { CROverview } from '../../components/CROverview';
import { CRTowerTroops } from '../../components/CRTowerTroops';
import { MatchHistory } from '../../components/MatchHistory';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { OverviewExtras } from './OverviewExtras';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type CRTab = TabId<'clash-royale'>;

/** Clash Royale sections: overview | cards | deck | battles | towers. */
export default function ClashRoyale({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const cr = playerStats.gameVisuals?.cr;
  if (!cr) {
    return (
      <EmptyState icon={<Swords />} title="No Clash Royale profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  const go = (id: CRTab) => onTabChange(id);
  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as CRTab) {
    case 'cards':
      return <CRCardsList cards={cr.cards} />;
    case 'deck':
      return <CRDeck playerStats={playerStats} />;
    case 'towers':
      return <CRTowerTroops playerStats={playerStats} />;
    case 'battles':
      return playerStats.recentMatches.length > 0 ? (
        <Card as="section" title="Recent battles">
          <MatchHistory matches={playerStats.recentMatches} />
        </Card>
      ) : (
        <EmptyState icon={<Swords />} title="No recent battles">
          Battles from the last few days appear here once this player has played.
        </EmptyState>
      );
    default:
      return (
        <div className="space-y-4">
          <CROverview playerStats={playerStats} onOpenDeck={() => go('deck')} />
          <OverviewExtras playerStats={playerStats} chartColor={game.chartPrimary} onShowBattles={() => go('battles')} />
        </div>
      );
  }
}
