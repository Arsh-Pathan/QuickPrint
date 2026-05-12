'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main className="flex min-h-screen flex-col items-center justify-center bg-m3-surface px-6 py-12">
            <div className="flex w-full max-w-sm flex-col items-center text-center">
              <div className="mb-8 relative">
                 <div className="absolute inset-0 bg-m3-red/10 blur-2xl rounded-full" />
                 <div className="relative h-20 w-20 flex items-center justify-center rounded-2xl bg-m3-red-container border border-m3-red/20 shadow-elev-1">
                    <AlertTriangle size={40} className="text-m3-red" />
                 </div>
              </div>
              
              <h1 className="m3-headline-l text-m3-ink mb-3">Something went wrong</h1>
              <p className="text-[15px] text-m3-ink-muted leading-relaxed mb-10">
                {this.state.error?.message ?? 'An unexpected error occurred while loading this page.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="m3-btn-filled w-full"
                >
                  <RefreshCcw size={18} />
                  Try again
                </button>
                <Link href="/" className="m3-btn-outlined w-full">
                  <Home size={18} />
                  Go home
                </Link>
              </div>

              <div className="mt-12 text-[11px] font-bold uppercase tracking-[0.2em] text-m3-ink-faint">
                System Diagnostics Active
              </div>
            </div>
          </main>
        )
      );
    }
    return this.props.children;
  }
}
