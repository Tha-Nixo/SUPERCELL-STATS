import { cx } from './cx';

/** A thin progress bar. Decorative: the number it shows is always printed next to it. */
export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <span aria-hidden="true" className={cx('block h-1.5 overflow-hidden rounded-pill bg-surface-2', className)}>
      <span className="block h-full rounded-pill bg-accent" style={{ width: `${width}%` }} />
    </span>
  );
}
