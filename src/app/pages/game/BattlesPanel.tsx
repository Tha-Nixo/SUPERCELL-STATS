import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { SearchX, Swords } from 'lucide-react';
import { MatchHistory, type BattleRow } from '../../components/MatchHistory';
import {
  battleModes, filterBattles, NO_FILTERS, parseBattleFilters, RESULT_FILTERS, resultCounts, withBattleFilters,
  type BattleFilters, type ResultFilter,
} from '../../ui/battleFilters';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { FilterGroup } from '../../ui/FilterGroup';

const RESULT_LABELS: Record<ResultFilter, string> = { all: 'All', win: 'Wins', loss: 'Losses', draw: 'Draws' };

interface BattlesPanelProps {
  matches: readonly BattleRow[];
  /** Headline tiles above the filters, given the battles of the selected mode (every result). */
  summary?: (battles: readonly BattleRow[]) => ReactNode;
  /** Other wording for the Result options given the battles of the selected mode; the URL values never change. */
  resultLabels?: (battles: readonly BattleRow[]) => Partial<Record<ResultFilter, string>> | undefined;
  /** Result options to leave out given the battles of the selected mode; the selected option is never left out. */
  hiddenResults?: (battles: readonly BattleRow[]) => readonly ResultFilter[];
}

/**
 * Battles tab: the recent battles with mode and result filters kept in the
 * URL (?mode=&result=, see ui/battleFilters.ts). Filter changes replace the
 * history entry, so Back still leaves the tab instead of undoing filters.
 */
export function BattlesPanel({ matches, summary, resultLabels, hiddenResults }: BattlesPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  // "Show all battles" unmounts with the empty state; hand focus to the
  // selected Result option so keyboard users land on the controls, not <body>.
  useEffect(() => {
    if (!refocus.current) return;
    const target = root.current?.querySelector<HTMLInputElement>('fieldset input[value="all"]:checked');
    if (target) {
      refocus.current = false;
      target.focus();
    }
  });

  if (matches.length === 0) {
    // Screen-tall like PanelSkeleton, so the footer stays off screen when this replaces it.
    return (
      <div className="min-h-dvh">
        <EmptyState icon={<Swords />} title="No recent battles">
          Battles from the last few days appear here once this player has played.
        </EmptyState>
      </div>
    );
  }

  const allModes = battleModes(matches);
  const filters = parseBattleFilters(location.search, allModes);
  const modes = battleModes(matches, filters.result);
  const results = resultCounts(matches, filters.mode);
  const shown = filterBattles(matches, filters);
  const scope = filterBattles(matches, { mode: filters.mode, result: 'all' });
  const labels = { ...RESULT_LABELS, ...resultLabels?.(scope) };
  const hidden = hiddenResults?.(scope) ?? [];

  // Reads window.location: a second arrow key can arrive before this re-renders.
  const apply = (change: Partial<BattleFilters>) => {
    const { pathname, search, hash } = window.location;
    const next = { ...parseBattleFilters(search, allModes), ...change };
    navigate(pathname + withBattleFilters(search, next) + hash, { replace: true });
  };

  return (
    <div ref={root} className="space-y-4">
      {summary?.(scope)}
      <Card as="section" aria-label="Battle filters" className="grid grid-cols-1 gap-4">
        <FilterGroup
          legend="Result"
          value={filters.result}
          onChange={(result) => apply({ result: result as ResultFilter })}
          options={RESULT_FILTERS.filter((r) => r === filters.result || !hidden.includes(r)).map((r) => ({ value: r, label: labels[r], count: results[r] }))}
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
          action={<Button onClick={() => {
            refocus.current = true;
            apply(NO_FILTERS);
          }}>Show all battles</Button>}
        >
          None of the last {matches.length} battles fits this mode and result.
        </EmptyState>
      )}
    </div>
  );
}
