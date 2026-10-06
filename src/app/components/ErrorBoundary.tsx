import { Component, ErrorInfo, ReactNode } from 'react';

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
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold text-white mb-3">Something broke on this page</h1>
          <p className="text-white/60 text-sm mb-6">
            The stats failed to render. Reloading usually fixes it; if it keeps happening the
            player's data may contain something we don't handle yet.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors"
            >
              Reload
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-xl border border-white/15 text-white/80 hover:text-white hover:bg-white/5 font-semibold transition-colors"
            >
              Back to home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
