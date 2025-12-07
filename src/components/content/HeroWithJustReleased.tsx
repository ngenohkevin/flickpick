'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { HeroSpotlight } from './HeroSpotlight';
import { JustReleasedRow } from './JustReleasedRow';
import { SkeletonRow } from '@/components/ui';
import type { Content } from '@/types';
import type { MovieWithAvailability } from '@/lib/torrentio';

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
  const [justReleasedMovies, setJustReleasedMovies] = useState<MovieWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchMovies() {
      try {
        const response = await fetch('/api/just-released/movies');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        if (isMounted) {
          setJustReleasedMovies(data.movies || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch just released movies:', err);
        if (isMounted) {
          setError('Failed to load');
          setIsLoading(false);
        }
      }
    }

    fetchMovies();

    return () => {
      isMounted = false;
    };
  }, []);

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
  const [justReleasedMovies, setJustReleasedMovies] = useState<MovieWithAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchMovies() {
      try {
        const response = await fetch('/api/just-released/movies');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        if (isMounted) {
          setJustReleasedMovies(data.movies || []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch just released movies:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchMovies();
    return () => { isMounted = false; };
  }, []);

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

  return <JustReleasedRow movies={justReleasedMovies} />;
}
