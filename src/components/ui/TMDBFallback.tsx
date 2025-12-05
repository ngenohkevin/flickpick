'use client';

// ==========================================================================
// TMDB Fallback Components
// Fallback UI when TMDB API fails or is unavailable
// ==========================================================================

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ServerCrash, RefreshCw, Home, Search, Film, Tv, Sparkles } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface TMDBFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void | Promise<void>;
  showAlternatives?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ==========================================================================
// TMDBFallback Component
// Main fallback when TMDB API fails
// ==========================================================================

export function TMDBFallback({
  title = 'Unable to Load Content',
  message = 'We\'re having trouble connecting to our content database. This is usually temporary.',
  onRetry,
  showAlternatives = true,
  className,
  size = 'md',
}: TMDBFallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  const sizeClasses = {
    sm: { container: 'py-8', icon: 'h-10 w-10', title: 'text-lg', message: 'text-sm' },
    md: { container: 'py-12', icon: 'h-12 w-12', title: 'text-xl', message: 'text-base' },
    lg: { container: 'py-16', icon: 'h-16 w-16', title: 'text-2xl', message: 'text-lg' },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', sizes.container, className)}>
      {/* Icon */}
      <div className="mb-6 inline-flex items-center justify-center rounded-full bg-warning/10 p-4">
        <ServerCrash className={cn(sizes.icon, 'text-warning')} />
      </div>

      {/* Title */}
      <h2 className={cn('font-bold text-text-primary', sizes.title)}>
        {title}
      </h2>

      {/* Message */}
      <p className={cn('mt-2 max-w-md text-text-secondary', sizes.message)}>
        {message}
      </p>

      {/* Suggestions */}
      <div className="mt-4 text-sm text-text-tertiary">
        <p>Try these steps:</p>
        <ul className="mt-2 list-disc text-left pl-4">
          <li>Wait a few moments and try again</li>
          <li>Refresh the page</li>
          <li>Check your internet connection</li>
        </ul>
      </div>

      {/* Retry Button */}
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
        {onRetry && (
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            leftIcon={<RefreshCw className={cn('h-4 w-4', isRetrying && 'animate-spin')} />}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </Button>
        )}
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-bg-tertiary px-6 py-3 font-medium text-text-primary border border-border-default transition-colors hover:bg-border-default"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>

      {/* Alternative Actions */}
      {showAlternatives && (
        <div className="mt-8 border-t border-border-subtle pt-6">
          <p className="mb-4 text-sm text-text-tertiary">
            While we fix this, you can:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link
              href="/watchlist"
              className="flex items-center gap-2 rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
            >
              <Sparkles className="h-4 w-4" />
              View Watchlist
            </Link>
            <Link
              href="/discover"
              className="flex items-center gap-2 rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
            >
              <Search className="h-4 w-4" />
              AI Discovery
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// TMDBContentFallback Component
// Inline fallback for content sections
// ==========================================================================

interface TMDBContentFallbackProps {
  sectionTitle?: string;
  onRetry?: () => void;
  className?: string;
}

export function TMDBContentFallback({
  sectionTitle,
  onRetry,
  className,
}: TMDBContentFallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = useCallback(async () => {
    if (!onRetry || isRetrying) return;
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, isRetrying]);

  return (
    <div className={cn('rounded-xl border border-border-subtle bg-bg-secondary p-6', className)}>
      <div className="flex flex-col items-center text-center sm:flex-row sm:text-left">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 sm:mb-0 sm:mr-4">
          <ServerCrash className="h-6 w-6 text-warning" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-text-primary">
            {sectionTitle ? `Unable to load ${sectionTitle}` : 'Content Unavailable'}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            We couldn&apos;t load this content. Please try again.
          </p>
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="mt-4 sm:ml-4 sm:mt-0"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Retry
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// TMDBRowFallback Component
// Placeholder for content rows that failed to load
// ==========================================================================

interface TMDBRowFallbackProps {
  title?: string;
  type?: 'movie' | 'tv';
  onRetry?: () => void;
  className?: string;
}

export function TMDBRowFallback({
  title = 'Content',
  type = 'movie',
  onRetry,
  className,
}: TMDBRowFallbackProps) {
  const Icon = type === 'tv' ? Tv : Film;

  return (
    <section className={className}>
      {title && (
        <h2 className="mb-4 text-xl font-semibold text-text-primary sm:mb-6 sm:text-2xl">
          {title}
        </h2>
      )}
      <div className="flex items-center justify-center rounded-xl border border-dashed border-border-default bg-bg-secondary/50 py-12">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-tertiary">
            <Icon className="h-6 w-6 text-text-tertiary" />
          </div>
          <p className="text-sm text-text-tertiary">Unable to load {title.toLowerCase()}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-accent-primary hover:text-accent-hover"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
