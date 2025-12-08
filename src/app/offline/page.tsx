'use client';

// ==========================================================================
// Offline Page
// Shown when the user is offline and the requested page isn't cached
// ==========================================================================

import { WifiOff, RefreshCw, Heart, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="container flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-bg-secondary">
        <WifiOff className="h-12 w-12 text-text-tertiary" />
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
        You&apos;re Offline
      </h1>

      {/* Description */}
      <p className="mt-4 max-w-md text-text-secondary">
        It looks like you&apos;ve lost your internet connection. Some features
        may not be available until you&apos;re back online.
      </p>

      {/* What's available */}
      <div className="mt-8 rounded-lg border border-border-subtle bg-bg-secondary p-6">
        <h2 className="mb-3 font-semibold text-text-primary">
          What you can still do:
        </h2>
        <ul className="space-y-2 text-left text-sm text-text-secondary">
          <li className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-error" />
            View your saved watchlist
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            Browse previously viewed content
          </li>
          <li className="flex items-center gap-2">
            <span className="text-success">✓</span>
            Access cached pages and images
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </button>
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
        >
          <Heart className="h-5 w-5" />
          View Watchlist
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
        >
          <Home className="h-5 w-5" />
          Go Home
        </Link>
      </div>
    </main>
  );
}
