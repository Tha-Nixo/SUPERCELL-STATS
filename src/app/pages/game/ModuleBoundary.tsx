import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ErrorState } from '../../ui/ErrorState';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Local safety net around the lazy game module. A stale tab after a deploy
 * asks for a chunk that no longer exists: the header and search stay usable
 * and the visitor can reload, instead of landing on the root crash screen.
 */
export class ModuleBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Game module failed', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        title="Could not load this section"
        message="This section could not be loaded. If the site was just updated, reload to get the latest version."
        onRetry={() => window.location.reload()}
      />
    );
  }
}
