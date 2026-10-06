import type { ReactNode } from 'react';
import { Trophy } from 'lucide-react';
import { Avatar } from './Avatar';
import { Pill } from './Pill';

/** What the shell knows about a player, whatever the game. */
export interface PlayerSummary {
  name: string;
  /** Display form with the leading '#'. */
  tag: string;
  avatar: { sources: string[]; alt: string; fallback: ReactNode };
  trophies?: number;
  level?: number;
  /** League / arena / rank, emoji already stripped. */
  league?: string;
  /** One more fact worth a pill (Clash of Clans: "Town Hall 15"). */
  extra?: string;
}

interface PlayerSummaryBarProps {
  summary: PlayerSummary;
  /** Row under the identity: data source pill, copy-link button. */
  meta?: ReactNode;
}

/** The player hero: identity on the left, the trophy count on the right (stacked on phones). */
export function PlayerSummaryBar({ summary, meta }: PlayerSummaryBarProps) {
  return (
    <section aria-label="Player summary" data-testid="player-summary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar key={summary.tag} {...summary.avatar} />
          <div className="min-w-0">
            <h1 className="font-display text-title leading-tight font-normal text-fg wrap-anywhere sm:text-display">{summary.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill>{summary.tag}</Pill>
              {summary.league && <Pill tone="accent">{summary.league}</Pill>}
              {summary.level !== undefined && <Pill>Level {summary.level}</Pill>}
              {summary.extra && <Pill>{summary.extra}</Pill>}
            </div>
          </div>
        </div>
        {summary.trophies !== undefined && (
          <div className="flex shrink-0 items-baseline gap-3 sm:flex-col sm:items-end sm:gap-1">
            <span className="text-xs text-fg-subtle">Trophies</span>
            <span className="inline-flex items-center gap-2 text-stat font-semibold tabular-nums text-fg">
              <Trophy aria-hidden="true" className="size-5 text-accent" />
              {summary.trophies.toLocaleString('en-US')}
            </span>
          </div>
        )}
      </div>
      {meta && <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div>}
    </section>
  );
}
