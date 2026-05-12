'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';

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
          <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
            <div className="flex w-full max-w-sm flex-col items-center text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <svg className="h-8 w-8 text-[#d93025]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-[22px] font-normal text-[#202124]">Something went wrong</h1>
              <p className="mt-2 text-sm text-[#5f6368]">
                {this.state.error?.message ?? 'An unexpected error occurred'}
              </p>
              <div className="mt-8 flex gap-3">
                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="google-button-secondary"
                >
                  Try again
                </button>
                <Link href="/" className="google-button-primary">
                  Go home
                </Link>
              </div>
            </div>
          </main>
        )
      );
    }
    return this.props.children;
  }
}
