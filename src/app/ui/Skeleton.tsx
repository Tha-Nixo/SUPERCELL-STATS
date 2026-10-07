import { cx } from './cx';

/** A static placeholder block; the pulsing lives on the wrapper (one animation per screen). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('rounded-card bg-surface-2', className)} />;
}

/**
 * Loading placeholder shaped like the player page (hero, tab strip, tiles,
 * two panels) with the same outer heights, so the real content lands without
 * shifting anything. Screen readers get the shell's live region instead.
 */
export function PlayerPageSkeleton() {
  return (
    <div aria-hidden="true" data-testid="player-skeleton" className="space-y-6 motion-safe:animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 sm:size-16" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-8 w-56 max-w-full" />
          <Skeleton className="h-7 w-40 max-w-full rounded-pill" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

/** Placeholder for a tab panel while its game module chunk downloads. The marker keeps the site footer out of the layout meanwhile (see SiteFooter), so the footer appears below the real panel instead of being pushed down by it. */
export function PanelSkeleton() {
  return (
    <div aria-hidden="true" data-testid="panel-skeleton" data-panel-loading="" className="grid min-h-[24rem] content-start gap-4 motion-safe:animate-pulse lg:grid-cols-2">
      <Skeleton className="h-72" />
      <Skeleton className="h-72" />
    </div>
  );
}
