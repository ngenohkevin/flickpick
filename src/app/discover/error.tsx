'use client';

// ==========================================================================
// Discover Page Error Boundary
// Handles errors in AI-powered discovery
// ==========================================================================

import { useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, RefreshCw, Film, Tv } from 'lucide-react';
import { Button } from '@/components/ui';
import { logError, classifyError } from '@/lib/error';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DiscoverError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, { component: 'DiscoverPage', action: 'aiDiscovery' });
  }, [error]);

  const appError = classifyError(error);
  const isAIError = appError.code === 'AI_ERROR';
  const isRateLimited = appError.code === 'RATE_LIMITED';

  return (
    <div className="container py-12">
      <div className="flex flex-col items-center justify-center text-center">
        {/* Icon */}
        <div className="mb-6 inline-flex items-center justify-center rounded-full bg-accent-primary/10 p-4">
          <Sparkles className="h-12 w-12 text-accent-primary" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary">
          {isRateLimited
            ? 'Slow Down'
            : isAIError
            ? 'AI Discovery Unavailable'
            : 'Discovery Error'}
        </h2>

        {/* Message */}
        <p className="mt-2 max-w-md text-text-secondary">
          {isRateLimited
            ? 'You\'re making requests too quickly. Please wait a moment and try again.'
            : isAIError
            ? 'Our AI recommendation engine is temporarily unavailable. Try browsing by category instead.'
            : 'Something went wrong with the discovery feature. Please try again.'}
        </p>

        {/* Actions */}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
          <Button
            onClick={reset}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
        </div>

        {/* Alternatives */}
        <div className="mt-8 border-t border-border-subtle pt-6">
          <p className="mb-4 text-sm text-text-tertiary">
            Or browse content manually:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/movies"
              className="flex items-center gap-2 rounded-full bg-badge-movie/20 px-4 py-2 text-sm font-medium text-badge-movie transition-colors hover:bg-badge-movie/30"
            >
              <Film className="h-4 w-4" />
              Movies
            </Link>
            <Link
              href="/tv"
              className="flex items-center gap-2 rounded-full bg-badge-tv/20 px-4 py-2 text-sm font-medium text-badge-tv transition-colors hover:bg-badge-tv/30"
            >
              <Tv className="h-4 w-4" />
              TV Shows
            </Link>
            <Link
              href="/category/trending"
              className="flex items-center gap-2 rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
            >
              Trending
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
