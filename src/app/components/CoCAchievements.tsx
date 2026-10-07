import { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, SearchX, Star } from 'lucide-react';
import type { CoCAchievement } from '../data/mockStats';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/EmptyState';
import { FilterGroup } from '../ui/FilterGroup';
import { ProgressBar } from '../ui/ProgressBar';
import { StatTile } from '../ui/StatTile';
import {
  ACHIEVEMENT_STATUSES, ACHIEVEMENT_VILLAGES, achievementView, groupDigits, isAchievementDone, showStars,
  type AchievementStatus, type AchievementVillage,
} from './cocFacts';

const n = (value: number) => value.toLocaleString('en-US');

/** Clash of Clans "Achievements" tab: progress per achievement, filterable by village and status. */
export function CoCAchievements({ achievements }: { achievements: readonly CoCAchievement[] }) {
  const [village, setVillage] = useState<AchievementVillage>('all');
  const [status, setStatus] = useState<AchievementStatus>('all');
  const filtersRef = useRef<HTMLDivElement>(null);
  const refocus = useRef(false);

  // "Reset filters" disappears with the empty state: give focus to the first village option.
  useEffect(() => {
    if (refocus.current) {
      refocus.current = false;
      filtersRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
    }
  });

  const view = achievementView(achievements, village, status);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Completed" value={n(view.done)} sub={`of ${n(achievements.length)} achievements`} icon={<Award />} />
        <StatTile label="Stars earned" value={n(view.stars)} sub="All villages" icon={<Star />} />
      </div>

      <Card as="section" aria-label="Achievement filters" className="grid gap-4 sm:grid-cols-2">
        <div ref={filtersRef} className="min-w-0">
          <FilterGroup
            legend="Village"
            options={ACHIEVEMENT_VILLAGES.map(([value, label]) => ({ value, label, count: view.villageCounts[value] }))}
            value={village}
            onChange={(v) => setVillage(v as AchievementVillage)}
          />
        </div>
        <FilterGroup
          legend="Status"
          options={ACHIEVEMENT_STATUSES.map(([value, label]) => ({ value, label, count: view.statusCounts[value] }))}
          value={status}
          onChange={(s) => setStatus(s as AchievementStatus)}
        />
      </Card>

      <p aria-live="polite" className="text-sm text-fg-muted">
        Showing {view.shown.length} of {achievements.length} achievements
      </p>

      {view.shown.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No achievements match"
          action={<Button onClick={() => { refocus.current = true; setVillage('all'); setStatus('all'); }}>Reset filters</Button>}
        >
          No achievement fits both filters. Pick another village or status.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
          {view.shown.map((a, i) => <AchievementTile key={`${a.name}-${a.village}-${i}`} achievement={a} />)}
        </ul>
      )}
    </div>
  );
}

function AchievementTile({ achievement: a }: { achievement: CoCAchievement }) {
  const done = isAchievementDone(a);
  const pct = a.target > 0 ? (a.value / a.target) * 100 : 0;
  return (
    <li data-testid="achievement" className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-1 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-sm font-semibold text-fg break-words">{a.name}</h3>
        {showStars(a) && <Stars count={a.stars} />}
      </div>
      {a.info && <p className={cx('text-xs text-fg-muted', done && 'max-sm:sr-only')}>{groupDigits(a.info)}</p>}
      {done ? (
        <p className="flex min-w-0 items-start gap-1.5 text-xs text-fg-muted">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-accent" />
          <span className="min-w-0 break-words">
            {a.completionInfo && a.completionInfo !== 'Completed!' ? (
              <>
                <span className="sr-only">Completed: </span>
                {groupDigits(a.completionInfo)}
              </>
            ) : (
              'Completed'
            )}
          </span>
        </p>
      ) : (
        <div>
          <p className="flex justify-between gap-3 text-xs tabular-nums text-fg-muted">
            <span>
              {n(a.value)}
              <span className="sr-only"> of {n(a.target)}</span>
            </span>
            <span aria-hidden="true">{n(a.target)}</span>
          </p>
          <ProgressBar pct={pct} className="mt-1" />
        </div>
      )}
    </li>
  );
}

function Stars({ count }: { count: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 pt-0.5">
      {[0, 1, 2].map((i) => (
        <Star key={i} aria-hidden="true" className={cx('size-3.5', i < count ? 'fill-current text-accent' : 'text-fg-subtle')} />
      ))}
      <span className="sr-only">{count} of 3 stars</span>
    </span>
  );
}
