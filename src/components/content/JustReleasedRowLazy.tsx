'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { JustReleasedRow } from './JustReleasedRow';
import { SkeletonRow } from '@/components/ui';
import type { MovieWithAvailability } from '@/lib/torrentio';

// ==========================================================================
// Just Released Row Lazy Component
// Fetches Torrentio-verified movies on the client side to avoid blocking SSR
// ==========================================================================

interface JustReleasedRowLazyProps {
  className?: string;
}

export function JustReleasedRowLazy({ className = '' }: JustReleasedRowLazyProps) {
  const [movies, setMovies] = useState<MovieWithAvailability[]>([]);
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
          setMovies(data.movies || []);
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

  // Don't render anything if there's an error or no movies
  if (error || (!isLoading && movies.length === 0)) {
    return null;
  }

  if (isLoading) {
    return (
      <section className={className}>
        {/* Header */}
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

  return <JustReleasedRow movies={movies} className={className} />;
}
