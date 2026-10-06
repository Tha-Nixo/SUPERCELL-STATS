import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  /** Heading level that keeps the heading order (h1 on the 404 page). */
  as?: 'h1' | 'h2' | 'h3';
  /** One or two sentences saying what to do next. */
  children?: ReactNode;
  action?: ReactNode;
}

/** Nothing to show yet: say why and what to do, in the interface's voice. */
export function EmptyState({ icon, title, as: Heading = 'h3', children, action }: EmptyStateProps) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-card bg-accent-soft text-accent [&_svg]:size-6">
        {icon}
      </span>
      <Heading className="text-base font-semibold leading-snug text-fg">{title}</Heading>
      {children && <div className="mt-2 max-w-sm text-sm text-pretty text-fg-muted">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
