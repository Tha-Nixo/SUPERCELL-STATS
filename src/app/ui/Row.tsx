import type { ReactNode } from 'react';
import { cx } from './cx';

interface RowProps {
  label: ReactNode;
  value: ReactNode;
  /** Small lucide icon, shown in an accent-tinted square. */
  icon?: ReactNode;
  className?: string;
}

/** Label on the left, value on the right: one line of a stats list. */
export function Row({ label, value, icon, className }: RowProps) {
  return (
    <div className={cx('flex min-h-11 items-center gap-3 py-2', className)}>
      {icon && (
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-4">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">{label}</span>
      <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-fg">{value}</span>
    </div>
  );
}
