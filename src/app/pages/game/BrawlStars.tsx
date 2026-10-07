import { Shield } from 'lucide-react';
import { BSBattleSummary } from '../../components/BSBattleSummary';
import { bsBattleRows, bsResultLabels } from '../../components/bsFacts';
import { BSOverview } from '../../components/BSOverview';
import { BSBrawlers, BSClub, BSProgression } from '../../components/BSProfile';
import { EmptyState } from '../../ui/EmptyState';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { TabId } from './tabs';
import type { GameModuleProps } from './types';

type BSTab = TabId<'brawl-stars'>;

/** Brawl Stars sections: overview | brawlers | progression | battles | club. */
export default function BrawlStars({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) {
    return (
      <EmptyState icon={<Shield />} title="No Brawl Stars profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }
  const accent = game.accent;
  const battles = bsBattleRows(bs.battlelog);
  const go = (id: BSTab) => onTabChange(id);

  // `tab` was validated against GAME_TABS by the shell; the union makes a misspelt id a type error.
  switch (tab as BSTab) {
    case 'brawlers':
      return <BSBrawlers playerStats={playerStats} accentColor={accent} />;
    case 'progression':
      return <BSProgression playerStats={playerStats} accentColor={accent} />;
    case 'battles':
      return <BattlesPanel matches={battles} summary={(scope) => <BSBattleSummary battles={scope} />} resultLabels={bsResultLabels} />;
    case 'club':
      return bs.club ? (
        <BSClub playerStats={playerStats} accentColor={accent} />
      ) : (
        <EmptyState icon={<Shield />} title={bs.clubTag ? 'Club details are unavailable' : 'Not in a club'}>
          {bs.clubTag
            ? 'The club could not be loaded right now. Reload the page to try again.'
            : 'This player has not joined a club yet.'}
        </EmptyState>
      );
    default:
      return (
        <div className="space-y-4">
          <BSOverview playerStats={playerStats} battles={battles} onOpenBrawlers={() => go('brawlers')} />
          <OverviewExtras playerStats={playerStats} matches={battles} chartColor={game.chartPrimary} onShowBattles={() => go('battles')} />
        </div>
      );
  }
}
