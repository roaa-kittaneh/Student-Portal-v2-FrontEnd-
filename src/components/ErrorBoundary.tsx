import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Class-based ErrorBoundary — the only component shape React allows for this.
 * Catches render-phase errors in descendants and renders a recovery UI.
 *
 * Note: it does NOT catch errors in event handlers, async code, or
 * server-side rendering. Those should be handled at the call site.
 */

type FallbackRender = (args: { error: Error; reset: () => void }) => ReactNode;

interface Props {
  children: ReactNode;
  fallback?: ReactNode | FallbackRender;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production this would forward to Sentry / Datadog / your logger.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (!error) return children;

    if (fallback) {
      return typeof fallback === 'function'
        ? (fallback as FallbackRender)({ error, reset: this.reset })
        : fallback;
    }

    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card card">
          <h2>Something went wrong.</h2>
          <p className="error-boundary__msg">{error.message || 'Unknown error'}</p>
          <button className="btn btn--primary" onClick={this.reset}>
            Try again
          </button>
        </div>
      </div>
    );
  }
}
