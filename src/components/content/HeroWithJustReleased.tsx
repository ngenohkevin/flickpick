'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { HeroSpotlight } from './HeroSpotlight';
import { JustReleasedRow } from './JustReleasedRow';
import { SkeletonRow } from '@/components/ui';
import { useWatchlist, watchlistKey } from '@/stores/watchlist';
import { getContentType } from '@/lib/utils';
import type { Content } from '@/types';
import type { MovieWithAvailability } from '@/lib/torrentio';

// The hero and the row both need this list: one request per page view
// (each fetched it separately). Reused for a few minutes across client
// navigations; a failed request isn't kept.
const SHARED_TTL_MS = 5 * 60 * 1000;
let shared: { at: number; promise: Promise<MovieWithAvailability[]> } | null = null;

function loadJustReleased(): Promise<MovieWithAvailability[]> {
  if (!shared || Date.now() - shared.at > SHARED_TTL_MS) {
    const promise = fetch('/api/just-released/movies')
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        return response.json() as Promise<{ movies?: MovieWithAvailability[] }>;
      })
      .then((data) => data.movies ?? []);
    promise.catch(() => {
      if (shared?.promise === promise) shared = null;
    });
    shared = { at: Date.now(), promise };
  }
  return shared.promise;
}

/** Verified 4K releases (empty if none or on error), and whether they're loading. */
function useJustReleasedMovies() {
  const [state, setState] = useState<{ movies: MovieWithAvailability[]; isLoading: boolean }>({
    movies: [],
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    loadJustReleased()
      .then((movies) => {
        if (isMounted) setState({ movies, isLoading: false });
      })
      .catch((err: unknown) => {
        console.error('Failed to fetch just released movies:', err);
        if (isMounted) setState({ movies: [], isLoading: false });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}

// ==========================================================================
// Hero With Just Released Component
// Shows trending initially, then updates hero with Torrentio content when loaded
// ==========================================================================

interface HeroWithJustReleasedProps {
  /** Initial trending items to show in hero while Torrentio loads */
  trendingItems: Content[];
  className?: string;
}

export function HeroWithJustReleased({
  trendingItems,
  className = '',
}: HeroWithJustReleasedProps) {
  const { movies: justReleasedMovies } = useJustReleasedMovies();

  // Determine hero items:
  // - If Torrentio loaded successfully with movies, use those
  // - Otherwise, use trending items
  const heroItems: Content[] = justReleasedMovies.length > 0
    ? justReleasedMovies.filter(m => m.backdrop_path).slice(0, 12) as Content[]
    : trendingItems;


  return (
    <>
      {/* Hero - Shows Torrentio content when loaded, trending as fallback */}
      <HeroSpotlight items={heroItems} className={className} />

      {/* Just Released Row - rendered by parent in main content area */}
      {/* Export the row content via a render prop or context - for now inline */}
    </>
  );
}

// Separate component for just the Just Released row (to be used in page layout)
export function JustReleasedSection() {
  const { movies: justReleasedMovies, isLoading } = useJustReleasedMovies();
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item) => watchlistKey(item.media_type, item.id)));

  const handleWatchlistToggle = (movie: MovieWithAvailability) => {
    watchlist.toggleItem({
      id: movie.id,
      title: movie.title,
      media_type: 'movie',
      content_type: getContentType(movie),
      poster_path: movie.poster_path,
    });
  };

  if (isLoading) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              Out Now in 4K
            </h2>
            <span className="flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-xs font-medium text-success">
              <Zap className="h-3 w-3" />
              Digital Release
            </span>
          </div>
        </div>
        <SkeletonRow count={6} />
      </section>
    );
  }

  if (justReleasedMovies.length === 0) {
    return null;
  }

  return (
    <JustReleasedRow
      movies={justReleasedMovies}
      watchlistIds={watchlistIds}
      onWatchlistToggle={handleWatchlistToggle}
    />
  );
}
