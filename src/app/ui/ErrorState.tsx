import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  /** The real reason, as mapped by the API layer. Shown verbatim. */
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
}

/**
 * A failed request. Not a live region on purpose: the page's own status
 * region already announces the failure once.
 */
export function ErrorState({ title, message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <div data-testid="error-state" className="flex flex-col gap-4 rounded-card border border-loss-line bg-loss-soft p-5 sm:flex-row sm:items-center">
      <AlertTriangle aria-hidden="true" className="size-6 shrink-0 text-loss" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-1 text-sm text-fg-muted wrap-anywhere">{message}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} disabled={retrying} className="shrink-0">
          <RotateCw aria-hidden="true" className={retrying ? 'motion-safe:animate-spin' : undefined} />
          Retry
        </Button>
      )}
    </div>
  );
}
