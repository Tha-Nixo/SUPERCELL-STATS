import { Award, Percent, Shield, Target, Trophy } from 'lucide-react';
import { BSBattleSummary } from '../../components/BSBattleSummary';
import { BSBrawlers, BSClub, BSHome, BSProgression } from '../../components/BSProfile';
import { bsBattleRows, bsResultLabels } from '../../components/bsFacts';
import type { PlayerStats } from '../../data/mockStats';
import { EmptyState } from '../../ui/EmptyState';
import { StatTile } from '../../ui/StatTile';
import { stripEmoji } from '../../ui/text';
import { BattlesPanel } from './BattlesPanel';
import { OverviewExtras } from './OverviewExtras';
import type { GameModuleProps } from './types';

/** The four headline numbers the old GamePage showed as StatCards, now StatTiles. */
function headlineStats(stats: PlayerStats) {
  const L = stats.statLabels ?? {};
  const wins = Math.round(stats.totalMatches * stats.winRate / 100);
  const kd = Number.isInteger(stats.kd) ? String(stats.kd) : stats.kd.toFixed(2);
  return [
    { label: L.stat1Title ?? 'Win rate', value: `${stats.winRate}%`, sub: L.stat1Sub ?? `${wins} wins`, icon: <Percent /> },
    { label: L.stat2Title ?? 'K/D ratio', value: L.stat2Value ?? kd, sub: L.stat2Sub ?? 'Average per game', icon: <Target /> },
    { label: L.stat3Title ?? 'Total matches', value: L.stat3Value ?? stats.totalMatches.toLocaleString('en-US'), sub: L.stat3Sub ?? `${stats.hoursPlayed} hours`, icon: <Award /> },
    { label: L.stat4Title ?? 'Trophies', value: L.stat4Value ?? String(stats.hoursPlayed), sub: L.stat4Sub ?? '', icon: <Trophy /> },
  ].map((s) => ({ ...s, value: stripEmoji(s.value), sub: stripEmoji(s.sub) }));
}

/** Brawl Stars sections: overview | brawlers | progression | battles | club. The data components are restyled in phase 3. */
export default function BrawlStars({ game, playerStats, tab, onTabChange }: GameModuleProps) {
  const bs = playerStats.gameVisuals?.bs;
  if (!bs) {
    return (
      <EmptyState icon={<Shield />} title="No Brawl Stars profile in this answer">
        The API answered without profile details for this tag. Try again in a minute.
      </EmptyState>
    );
  }
  // Every section takes the game accent now (it used to be the player's name colour, which could be unreadable).
  const accent = game.accent;
  const battles = bsBattleRows(bs.battlelog);

  switch (tab) {
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
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {headlineStats(playerStats).map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} sub={s.sub || undefined} icon={s.icon} />
            ))}
          </div>
          <BSHome playerStats={playerStats} accentColor={accent} />
          <OverviewExtras
            playerStats={playerStats}
            matches={battles}
            chartColor={game.chartPrimary}
            onShowBattles={() => onTabChange('battles')}
          />
        </div>
      );
  }
}
