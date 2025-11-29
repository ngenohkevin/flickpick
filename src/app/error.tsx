'use client';

// ==========================================================================
// Error Boundary Component
// Handles unexpected errors in the application
// ==========================================================================

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        {/* Error Icon */}
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-error/10 p-4">
          <AlertCircle className="h-12 w-12 text-error" />
        </div>

        {/* Error Message */}
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          Something went wrong
        </h1>
        <p className="mb-8 max-w-md text-text-secondary">
          We encountered an unexpected error. Please try again or return to the
          homepage.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
          >
            <Home className="h-4 w-4" />
            Go home
          </Link>
        </div>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-text-tertiary hover:text-text-secondary">
              Error details
            </summary>
            <pre className="mt-2 max-w-lg overflow-auto rounded-lg bg-bg-tertiary p-4 text-xs text-text-secondary">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
