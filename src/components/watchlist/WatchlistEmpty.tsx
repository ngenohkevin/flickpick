'use client';

// ==========================================================================
// Watchlist Empty Component
// Shown when user's watchlist is empty
// ==========================================================================

import Link from 'next/link';
import { Heart, Search, Sparkles, Film } from 'lucide-react';

// ==========================================================================
// Types
// ==========================================================================

interface WatchlistEmptyProps {
  className?: string;
}

// ==========================================================================
// Watchlist Empty Component
// ==========================================================================

export function WatchlistEmpty({ className = '' }: WatchlistEmptyProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 text-center ${className}`}>
      {/* Icon */}
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-bg-secondary">
        <Heart className="h-12 w-12 text-text-tertiary" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-semibold text-text-primary">
        Your watchlist is empty
      </h2>

      {/* Description */}
      <p className="mt-2 max-w-md text-text-secondary">
        Start adding movies and TV shows you want to watch. Click the heart icon
        on any title to add it to your watchlist.
      </p>

      {/* Quick Actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/movies"
          className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          <Film className="h-5 w-5" />
          Browse Movies
        </Link>
        <Link
          href="/tv"
          className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
        >
          <Film className="h-5 w-5" />
          Browse TV Shows
        </Link>
      </div>

      {/* Additional Options */}
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          href="/discover"
          className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-primary"
        >
          <Sparkles className="h-4 w-4" />
          Try AI Discovery
        </Link>
        <span className="hidden text-text-tertiary sm:inline">•</span>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-accent-primary"
        >
          <Search className="h-4 w-4" />
          Search for titles
        </Link>
      </div>
    </div>
  );
}
