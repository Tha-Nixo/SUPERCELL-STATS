import type { ReactNode } from 'react';
import { ProgressBar } from '../ui/ProgressBar';
import { levelFacts, levelText, type Leveled } from './cocFacts';

/** "11 / 12", "12 / 12 Max" or "Not unlocked"; screen readers hear "Level 11 of 12". */
export function LevelText({ item, percent = false }: { item: Leveled; percent?: boolean }) {
  const f = levelFacts(item);
  const text = levelText(item);
  if (f.locked) return <span className="text-xs text-fg-subtle">Not unlocked</span>;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-xs tabular-nums text-fg-muted">
      <span aria-hidden="true">{text.visible}</span>
      <span className="sr-only">{text.spoken}</span>
      {percent && f.hasMax && !f.maxed && <span className="text-fg-subtle">· {f.pct}%</span>}
      {f.maxed && <span className="font-semibold text-accent">Max</span>}
    </span>
  );
}

interface LevelItemProps {
  name: string;
  /** Omitted for things without a meaningful level (super troops). */
  item?: Leveled;
  /** A GameImage, already sized. */
  art?: ReactNode;
  /** Pills next to the level ("Boosted now", "Equipped"). */
  extra?: ReactNode;
}

/** One troop, spell, pet or piece of equipment: art, printed name and level, a bar. */
export function LevelItem({ name, item, art, extra }: LevelItemProps) {
  const f = item ? levelFacts(item) : undefined;
  return (
    <li data-testid="coc-item" className="flex min-w-0 items-center gap-3 rounded-card border border-line bg-surface-1 p-2.5 sm:p-3">
      {art}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium text-fg break-words">{name}</p>
        {(item || extra) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            {item && <LevelText item={item} />}
            {extra}
          </div>
        )}
        {f && !f.locked && <ProgressBar pct={f.pct} className="mt-1.5" />}
      </div>
    </li>
  );
}
