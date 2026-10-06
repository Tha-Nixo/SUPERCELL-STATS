import type { ReactNode } from 'react';

interface StatTileProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}

/** One headline number. The value uses the clamp()ed stat size so it never clips at 320px. */
export function StatTile({ label, value, sub, icon }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-surface-1 p-4">
      <div className="flex min-w-0 items-center gap-2 text-fg-subtle">
        {icon && <span aria-hidden="true" className="text-accent [&_svg]:size-4">{icon}</span>}
        <span className="truncate text-xs font-medium">{label}</span>
      </div>
      <div className="text-stat font-semibold tracking-tight tabular-nums text-fg wrap-anywhere">{value}</div>
      {sub && <div className="truncate text-xs text-fg-subtle">{sub}</div>}
    </div>
  );
}
