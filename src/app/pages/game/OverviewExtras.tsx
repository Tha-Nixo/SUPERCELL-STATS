import { ArrowRight, Swords } from 'lucide-react';
import { MatchHistory } from '../../components/MatchHistory';
import { TrophyTrend } from '../../components/TrophyTrend';
import type { PlayerStats } from '../../data/mockStats';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';

interface OverviewExtrasProps {
  playerStats: PlayerStats;
  accent: string;
  chartColor: string;
  onShowBattles: () => void;
}

/** Bottom of the Clash Royale and Brawl Stars overview: trend left, latest battles right (stacked on phones). */
export function OverviewExtras({ playerStats, accent, chartColor, onShowBattles }: OverviewExtrasProps) {
  const latest = playerStats.recentMatches.slice(0, 5);
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        {playerStats.performanceData.length > 1 ? (
          <TrophyTrend data={playerStats.performanceData} accentColor={chartColor} />
        ) : (
          <EmptyState icon={<Swords />} title="No trophy trend yet">
            The trend needs at least two recent battles that moved trophies.
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
          <MatchHistory matches={latest} accentColor={accent} />
        ) : (
          <p className="text-sm text-fg-muted">No battles in the last few days.</p>
        )}
      </Card>
    </div>
  );
}
