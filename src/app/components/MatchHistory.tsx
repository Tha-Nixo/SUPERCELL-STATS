import type { ReactNode } from 'react';
import { Crown, Minus, Trophy, X } from 'lucide-react';
import type { Match } from '../data/mockStats';
import { trophyLabel } from '../ui/battleFilters';
import { cx } from '../ui/cx';
import { Pill, type PillTone } from '../ui/Pill';

interface MatchHistoryProps {
  matches: Match[];
}

const RESULT: Record<Match['result'], { label: string; tone: PillTone; icon: ReactNode }> = {
  win: { label: 'Win', tone: 'win', icon: <Trophy /> },
  loss: { label: 'Loss', tone: 'loss', icon: <X /> },
  draw: { label: 'Draw', tone: 'draw', icon: <Minus /> },
};

/**
 * A list of battles, newest first, one row each: result, mode and date, then
 * crowns and trophy change when the game reports them. Used by the
 * Clash Royale and Brawl Stars overviews and by the Clash Royale Battles tab;
 * the caller provides the surrounding Card.
 */
export function MatchHistory({ matches }: MatchHistoryProps) {
  // One trophy column for the whole list, so crowns line up when some battles moved no trophies.
  const trophyColumn = matches.some((m) => m.score !== undefined);
  return (
    <ol className="divide-y divide-line">
      {matches.map((match) => {
        const result = RESULT[match.result];
        return (
          <li key={match.id} data-testid="battle-row" className="flex min-h-14 items-center gap-3 py-3">
            <Pill tone={result.tone} icon={result.icon} className="w-20 shrink-0 justify-center">
              {result.label}
            </Pill>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{match.mode}</p>
              <p className="text-xs text-fg-subtle">
                {match.date}
                {match.duration && ` · ${match.duration}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 text-sm tabular-nums">
              {match.kills !== undefined && (
                <span className="inline-flex items-center gap-1 text-fg-muted">
                  <Crown aria-hidden="true" className="size-4 text-fg-subtle" />
                  <span className="sr-only">Crowns </span>
                  {match.kills}–{match.deaths ?? 0}
                </span>
              )}
              {trophyColumn && (
                <span
                  title={match.score !== undefined ? trophyLabel(match.mode) : undefined}
                  className={cx(
                    'inline-flex w-12 items-center justify-end gap-1 font-semibold',
                    (match.score ?? 0) > 0 ? 'text-win' : (match.score ?? 0) < 0 ? 'text-loss' : 'text-fg-muted',
                  )}
                >
                  {match.score !== undefined && (
                    <>
                      <span className="sr-only">{trophyLabel(match.mode)} </span>
                      {match.score > 0 ? `+${match.score}` : match.score}
                    </>
                  )}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
