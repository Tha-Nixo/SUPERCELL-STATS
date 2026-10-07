import { BarChart2, Users, Zap } from 'lucide-react';
import type { BSBrawlerData } from '../data/mockStats';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Row } from '../ui/Row';
import { StatTile } from '../ui/StatTile';
import { progressionFacts } from './bsBrawlerList';

const n = (value: number) => value.toLocaleString('en-US');

/**
 * Brawl Stars "Progression" tab: how many brawlers sit at each power level and
 * how far the brawlers' trophies are from their best. Every count is printed,
 * not only shown on hover.
 */
export function BSProgression({ brawlers }: { brawlers: readonly BSBrawlerData[] }) {
  if (brawlers.length === 0) {
    return (
      <EmptyState icon={<BarChart2 />} title="No progression to show">
        Progression appears once the API lists this player's brawlers.
      </EmptyState>
    );
  }

  const facts = progressionFacts(brawlers);
  const most = Math.max(...facts.powerCounts, 1);
  const gap = Math.max(facts.peakTrophies - facts.trophies, 0);
  const pct = facts.peakTrophies > 0 ? Math.min(100, (facts.trophies / facts.peakTrophies) * 100) : 100;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="At power 11" value={n(facts.maxed)} sub={`of ${n(brawlers.length)} brawlers`} icon={<Zap />} />
        <StatTile label="1,000+ trophies" value={n(facts.over1000)} sub={`of ${n(brawlers.length)} brawlers`} icon={<Users />} />
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card as="section" title="Power levels" className="min-w-0">
          <ol className="space-y-2">
            {facts.powerCounts.map((count, i) => (
              <li key={i} data-testid="power-level" className="grid grid-cols-[4.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                <span className="text-fg-muted">Power {i + 1}</span>
                <span aria-hidden="true" className="h-2 overflow-hidden rounded-pill bg-surface-2">
                  <span className="block h-full rounded-pill bg-accent" style={{ width: `${(count / most) * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-fg">
                  {count}
                  <span className="sr-only"> brawlers</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card as="section" title="Trophies and best" className="min-w-0">
          <div className="divide-y divide-line">
            <Row label="All brawlers now" value={n(facts.trophies)} />
            <Row label="All brawlers at their best" value={n(facts.peakTrophies)} />
          </div>
          <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-pill bg-surface-2">
            <div className="h-full rounded-pill bg-accent" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-fg-muted">
            {gap > 0 ? `${n(gap)} trophies below their combined best.` : 'Every brawler is at its best.'}
          </p>
        </Card>
      </div>
    </div>
  );
}
