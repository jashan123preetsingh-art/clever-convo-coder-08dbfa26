import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackRoute?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouteErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-8 min-h-[50vh]">
          <div className="max-w-sm w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="text-sm font-bold text-foreground">This section crashed</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred in this view.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-all"
              >
                <Home className="w-3 h-3" /> Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
