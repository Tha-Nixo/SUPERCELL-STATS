import { Fragment, type ReactNode } from 'react';
import { Crown, Medal, Minus, Trophy, X } from 'lucide-react';
import type { Match } from '../data/mockStats';
import { placementVerdict, trophyLabel, trophyQualifier } from '../ui/battleFilters';
import { cx } from '../ui/cx';
import { Pill, type PillTone } from '../ui/Pill';
import { ordinal } from '../ui/text';

/** One battle as listed: Brawl Stars rows add the map and, in Showdown, the placement. */
export type BattleRow = Match & {
  map?: string;
  /** Showdown finishing position (1 = first); team modes have none. */
  placement?: number;
};

interface MatchHistoryProps {
  matches: readonly BattleRow[];
}

const RESULT: Record<Match['result'], { label: string; tone: PillTone; icon: ReactNode }> = {
  win: { label: 'Win', tone: 'win', icon: <Trophy /> },
  loss: { label: 'Loss', tone: 'loss', icon: <X /> },
  draw: { label: 'Draw', tone: 'draw', icon: <Minus /> },
};

/**
 * A list of battles, newest first, one row each: result, mode, map and date,
 * then crowns and the trophy change when the game
 * reports them. A Showdown row's pill shows the placement and why it is
 * green or red (placementVerdict). Used by both overviews and both Battles tabs; the caller
 * provides the surrounding Card.
 */
export function MatchHistory({ matches }: MatchHistoryProps) {
  // One trophy column for the whole list, so crowns line up when some battles moved no trophies.
  const trophyColumn = matches.some((m) => m.score !== undefined);
  // Room for the "PoL" tag, only in lists that contain such a row.
  const qualified = matches.some((m) => m.score !== undefined && trophyQualifier(m.mode));
  return (
    <ol className="divide-y divide-line">
      {matches.map((match) => {
        const result = RESULT[match.result];
        const verdict = placementVerdict(match);
        return (
          <li key={match.id} data-testid="battle-row" className="flex min-h-14 items-center gap-3 py-3">
            {verdict !== undefined && match.placement !== undefined ? (
              <Pill tone={result.tone} icon={<Medal />} className="w-20 shrink-0 justify-center">
                <span className="sr-only">Placed </span>
                {ordinal(match.placement)}
                <span className="sr-only">, {verdict}</span>
              </Pill>
            ) : (
              <Pill tone={result.tone} icon={result.icon} className="w-20 shrink-0 justify-center">
                {result.label}
              </Pill>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg wrap-anywhere">{match.mode}</p>
              {/* Each part stays on one line; a narrow row breaks between them, never inside one. */}
              <p className="text-xs text-fg-subtle">
                {[match.map, match.date, match.duration].filter(Boolean).map((part, i) => (
                  <Fragment key={i}>
                    {i > 0 && ' '}
                    {/* The separator belongs to the part after it, so no line ends with one. */}
                    <span className="whitespace-nowrap">{i > 0 && '· '}{part}</span>
                  </Fragment>
                ))}
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
                    'inline-flex items-center justify-end gap-1 font-semibold',
                    qualified ? 'w-16' : 'w-12',
                    (match.score ?? 0) > 0 ? 'text-win' : (match.score ?? 0) < 0 ? 'text-loss' : 'text-fg-muted',
                  )}
                >
                  {match.score !== undefined && (
                    <>
                      <span className="sr-only">{trophyLabel(match.mode)} </span>
                      {match.score > 0 ? `+${match.score}` : match.score}
                      {trophyQualifier(match.mode) && (
                        <span aria-hidden="true" className="text-xs font-normal text-fg-subtle">
                          {trophyQualifier(match.mode)}
                        </span>
                      )}
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
