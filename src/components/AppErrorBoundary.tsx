import React from "react";

type AppErrorBoundaryState = {
  error: Error | null;
};

type AppErrorBoundaryProps = {
  children: React.ReactNode;
};

export default class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Branch Weaver render error:", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="app-shell">
        <main className="canvas-area" style={{ padding: "1.25rem" }}>
          <div className="error-banner">
            <strong>Render Error</strong>
            <pre>{this.state.error.stack || this.state.error.message}</pre>
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
            >
              Reload
            </button>
          </div>
        </main>
      </div>
    );
  }
}
