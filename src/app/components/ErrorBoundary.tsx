import { Component, ErrorInfo, ReactNode } from 'react';
import { buttonClasses } from '../ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Without this, any render-time throw leaves the visitor on a silent black
 * page — React unmounts the whole tree and nothing says why.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4 py-16">
        <div className="w-full rounded-card border border-line bg-surface-1 p-6 shadow-card">
          <h1 className="text-xl font-semibold text-fg">Something broke on this page</h1>
          <p className="mt-2 text-sm text-fg-muted">
            The stats failed to render. Reloading usually fixes it; if it keeps happening the
            player's data may contain something we don't handle yet.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => window.location.reload()} className={buttonClasses('primary')}>
              Reload
            </button>
            <a href="/" className={buttonClasses('secondary')}>
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }
}
