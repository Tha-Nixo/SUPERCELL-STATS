import { useLocation, useNavigate } from 'react-router';
import { SearchX, Swords } from 'lucide-react';
import { MatchHistory } from '../../components/MatchHistory';
import type { Match } from '../../data/mockStats';
import {
  battleModes, filterBattles, NO_FILTERS, parseBattleFilters, resultCounts, withBattleFilters,
  type BattleFilters, type ResultFilter,
} from '../../ui/battleFilters';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { FilterGroup } from '../../ui/FilterGroup';

const RESULT_LABELS: Record<ResultFilter, string> = { all: 'All', win: 'Wins', loss: 'Losses', draw: 'Draws' };

/**
 * Battles tab: the recent battles with mode and result filters kept in the
 * URL (?mode=&result=, see ui/battleFilters.ts). Filter changes replace the
 * history entry, so Back still leaves the tab instead of undoing filters.
 */
export function BattlesPanel({ matches }: { matches: Match[] }) {
  const location = useLocation();
  const navigate = useNavigate();

  if (matches.length === 0) {
    return (
      <EmptyState icon={<Swords />} title="No recent battles">
        Battles from the last few days appear here once this player has played.
      </EmptyState>
    );
  }

  const allModes = battleModes(matches);
  const filters = parseBattleFilters(location.search, allModes);
  const modes = battleModes(matches, filters.result);
  const results = resultCounts(matches, filters.mode);
  const shown = filterBattles(matches, filters);

  // Reads window.location: a second arrow key can arrive before this re-renders.
  const apply = (change: Partial<BattleFilters>) => {
    const { pathname, search, hash } = window.location;
    const next = { ...parseBattleFilters(search, allModes), ...change };
    navigate(pathname + withBattleFilters(search, next) + hash, { replace: true });
  };

  return (
    <div className="space-y-4">
      <Card as="section" aria-label="Battle filters" className="grid grid-cols-1 gap-4">
        <FilterGroup
          legend="Result"
          value={filters.result}
          onChange={(result) => apply({ result: result as ResultFilter })}
          options={(Object.keys(RESULT_LABELS) as ResultFilter[]).map((r) => ({ value: r, label: RESULT_LABELS[r], count: results[r] }))}
        />
        {allModes.length > 1 && (
          <FilterGroup
            legend="Mode"
            value={filters.mode}
            onChange={(mode) => apply({ mode })}
            options={[
              { value: 'all', label: 'All modes', count: modes.reduce((sum, m) => sum + m.count, 0) },
              ...modes.map((m) => ({ value: m.slug, label: m.label, count: m.count })),
            ]}
          />
        )}
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {shown.length} of {matches.length} recent battles
      </p>

      {shown.length > 0 ? (
        <Card as="section" title="Recent battles">
          <MatchHistory matches={shown} />
        </Card>
      ) : (
        <EmptyState
          icon={<SearchX />}
          title="No battles match these filters"
          action={<Button onClick={() => apply(NO_FILTERS)}>Show all battles</Button>}
        >
          None of the last {matches.length} battles fits this mode and result.
        </EmptyState>
      )}
    </div>
  );
}
