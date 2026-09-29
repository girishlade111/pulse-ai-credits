import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional shell shown instead of the default panel. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time crashes so a bug in one page shows a recoverable screen
 * instead of a blank document.
 *
 * A class component on purpose: there is no hook equivalent of
 * `componentDidCatch`, and this has to work around the error, not the component
 * tree that produced it.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kept on the console rather than a reporting service: this build has no
    // telemetry, and a swallowed stack trace is worse than a noisy one.
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  private readonly reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <main className="page flex min-h-dvh flex-col items-center justify-center py-16 text-center">
        <p className="display-lg text-muted-soft" aria-hidden="true">
          500
        </p>
        <h1 className="display-md mt-2">Something broke on this page.</h1>
        <p className="body-md mt-3 max-w-md text-balance text-muted">
          The interface hit an error it could not recover from. Reloading usually
          fixes it; if it keeps happening, the details are in the browser console.
        </p>

        <pre
          className={cn(
            "mt-6 max-w-lg overflow-x-auto rounded-md border border-hairline bg-surface-soft p-3",
            "caption text-left whitespace-pre-wrap text-muted"
          )}
        >
          {error.message}
        </pre>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => window.location.reload()}>Reload</Button>
          <Button variant="outline" onClick={this.reset}>
            Try again
          </Button>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
