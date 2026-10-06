import { Swords } from 'lucide-react';
import { CRCardsList } from '../../components/CRCardsList';
import { CRDeck } from '../../components/CRDeck';
import { CROverview } from '../../components/CROverview';
import { CRTowerTroops } from '../../components/CRTowerTroops';
import { MatchHistory } from '../../components/MatchHistory';
import { EmptyState } from '../../ui/EmptyState';
import { OverviewExtras } from './OverviewExtras';
import type { GameModuleProps } from './types';

/** Clash Royale sections: overview | cards | deck | battles | towers. The data components are restyled in phase 2. */
export default function ClashRoyale({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const cr = playerStats.gameVisuals?.cr;
  if (!cr) {
    return (
      <EmptyState icon={<Swords />} title="No Clash Royale profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }

  switch (tab) {
    case 'cards':
      return <CRCardsList cards={cr.cards} accent={game.accent} />;
    case 'deck':
      return <CRDeck playerStats={playerStats} accent={game.accent} />;
    case 'towers':
      return <CRTowerTroops playerStats={playerStats} />;
    case 'battles':
      return playerStats.recentMatches.length > 0 ? (
        <MatchHistory matches={playerStats.recentMatches} accentColor={game.accent} />
      ) : (
        <EmptyState icon={<Swords />} title="No recent battles">
          Battles from the last few days appear here once this player has played.
        </EmptyState>
      );
    default:
      return (
        <div className="space-y-8">
          {/* CROverview's "view deck" link still says 'deck'; older code said 'tower' for towers. */}
          <CROverview playerStats={playerStats} accent={game.accent} onTabChange={(id) => onTabChange(id === 'tower' ? 'towers' : id)} />
          <OverviewExtras playerStats={playerStats} accent={game.accent} chartColor={game.chartPrimary} onShowBattles={() => onTabChange('battles')} />
        </div>
      );
  }
}
