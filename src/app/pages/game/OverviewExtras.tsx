import { ArrowRight, Swords } from 'lucide-react';
import { MatchHistory } from '../../components/MatchHistory';
import { TrophyTrend } from '../../components/TrophyTrend';
import type { PlayerStats } from '../../data/mockStats';
import { Button } from '../../ui/Button';
import { latestBattles } from '../../ui/battleFilters';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';

interface OverviewExtrasProps {
  playerStats: PlayerStats;
  chartColor: string;
  onShowBattles: () => void;
  /** Set when the trend only counts some battles ("Trophy Road battles"). */
  trendScope?: string;
  /** Extra sentence for the empty trend state. */
  trendEmptyNote?: string;
}

/** Bottom of the Clash Royale and Brawl Stars overview: trend left, latest battles right (stacked on phones). */
export function OverviewExtras({ playerStats, chartColor, onShowBattles, trendScope, trendEmptyNote }: OverviewExtrasProps) {
  const latest = latestBattles(playerStats.recentMatches);
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        {playerStats.performanceData.length > 1 ? (
          <TrophyTrend data={playerStats.performanceData} accentColor={chartColor} scope={trendScope} />
        ) : (
          <EmptyState icon={<Swords />} title="No trophy trend yet">
            The trend needs at least two recent battles that moved trophies.{trendEmptyNote ? ` ${trendEmptyNote}` : ''}
          </EmptyState>
        )}
      </div>
      <Card
        className="min-w-0"
        title="Latest battles"
        action={latest.length > 0 && (
          <Button variant="ghost" onClick={onShowBattles}>
            All battles
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      >
        {latest.length > 0 ? (
          <MatchHistory matches={latest} />
        ) : (
          <p className="text-sm text-fg-muted">No battles in the last few days.</p>
        )}
      </Card>
    </div>
  );
}
