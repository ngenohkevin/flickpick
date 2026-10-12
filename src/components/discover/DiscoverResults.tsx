'use client';

import Link from 'next/link';
import { Plus, Check, Star, Sparkles, Play, Zap, Database, Info } from 'lucide-react';
import { ContentPoster } from '@/components/content/ContentPoster';
import { cn } from '@/lib/utils';
import type { EnrichedRecommendation } from '@/lib/ai/types';
import type { Content } from '@/types';
import { watchlistKey } from '@/stores/watchlist';

// ==========================================================================
// Discover Results Component
// Compact grid of AI-recommended content with reasons
// ==========================================================================

interface DiscoverResultsProps {
  results: EnrichedRecommendation[];
  isLoading?: boolean;
  provider?: string;
  isFallback?: boolean;
  watchlistIds?: Set<string>; // watchlistKey() values
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
}

/**
 * Get provider display info
 */
function getProviderInfo(provider?: string): { icon: React.ReactNode; label: string; description: string } {
  switch (provider) {
    case 'gemini':
      return {
        icon: <Sparkles className="h-4 w-4" />,
        label: 'AI-Powered',
        description: 'Personalized by Gemini AI',
      };
    case 'tastedive':
      return {
        icon: <Zap className="h-4 w-4" />,
        label: 'Similar Titles',
        description: 'Based on titles you mentioned',
      };
    case 'tmdb':
      return {
        icon: <Database className="h-4 w-4" />,
        label: 'Smart Match',
        description: 'Matched from your preferences',
      };
    default:
      return {
        icon: <Sparkles className="h-4 w-4" />,
        label: 'Recommendations',
        description: 'Based on your request',
      };
  }
}

export function DiscoverResults({
  results,
  isLoading = false,
  provider,
  isFallback = false,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: DiscoverResultsProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <DiscoverResultsSkeleton />
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  const providerInfo = getProviderInfo(provider);

  return (
    <div className={className}>
      {/* Results header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            isFallback ? 'bg-amber-500/10 text-amber-500' : 'bg-accent-primary/10 text-accent-primary'
          )}>
            {providerInfo.icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {results.length} {providerInfo.label}
            </h2>
            <p className="text-xs text-text-tertiary">{providerInfo.description}</p>
          </div>
        </div>

        {/* Fallback indicator */}
        {isFallback && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-1.5">
            <Info className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs text-amber-500/90">
              Using alternative matching
            </span>
          </div>
        )}
      </div>

      {/* Results grid - compact cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((result, index) => (
          <CompactResultCard
            key={`${result.id}-${result.media_type}`}
            result={result}
            priority={index < 6}
            isInWatchlist={watchlistIds?.has(watchlistKey(result.media_type, result.id))}
            onWatchlistToggle={onWatchlistToggle}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
// Compact Result Card
// ==========================================================================

interface CompactResultCardProps {
  result: EnrichedRecommendation;
  priority?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (content: Content) => void;
}

function CompactResultCard({
  result,
  priority = false,
  isInWatchlist = false,
  onWatchlistToggle,
}: CompactResultCardProps) {
  const detailUrl = result.media_type === 'tv' ? `/tv/${result.id}` : `/movie/${result.id}`;

  const asContent = result.media_type === 'movie'
    ? ({
        id: result.id,
        media_type: 'movie' as const,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path,
        vote_average: result.vote_average,
        vote_count: result.vote_count,
        overview: result.overview,
        popularity: result.popularity,
        original_language: result.original_language,
        genre_ids: result.genre_ids,
        title: result.title,
        original_title: result.title,
        release_date: `${result.year}-01-01`,
        adult: false,
      } satisfies Content)
    : ({
        id: result.id,
        media_type: 'tv' as const,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path,
        vote_average: result.vote_average,
        vote_count: result.vote_count,
        overview: result.overview,
        popularity: result.popularity,
        original_language: result.original_language,
        genre_ids: result.genre_ids,
        name: result.title,
        original_name: result.title,
        first_air_date: `${result.year}-01-01`,
        number_of_seasons: 1,
        number_of_episodes: 1,
        episode_run_time: [],
        status: 'Ended' as const,
        type: 'Scripted',
      } satisfies Content);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatchlistToggle?.(asContent);
  };

  const typeColors = {
    movie: 'bg-purple-500',
    tv: 'bg-cyan-500',
    animation: 'bg-orange-500',
    anime: 'bg-pink-500',
  };

  return (
    <Link href={detailUrl} className="group block">
      <article className="relative overflow-hidden rounded-xl bg-bg-secondary/50 transition-all duration-300 hover:bg-bg-secondary hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1">
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
          <ContentPoster
            path={result.poster_path}
            alt={result.title}
            size="medium"
            priority={priority}
            fill
            className="transition-transform duration-500 group-hover:scale-110"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

          {/* Content type indicator */}
          <div className={cn(
            'absolute left-2 top-2 h-1.5 w-8 rounded-full',
            typeColors[result.content_type]
          )} />

          {/* Rating badge */}
          {result.vote_average > 0 && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium text-white">
                {result.vote_average.toFixed(1)}
              </span>
            </div>
          )}

          {/* Watchlist button */}
          <button
            onClick={handleWatchlistClick}
            className={cn(
              'absolute right-2 bottom-12 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
              'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0',
              isInWatchlist
                ? 'bg-accent-primary text-white'
                : 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
            )}
            aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
          >
            {isInWatchlist ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </button>

          {/* Bottom info overlay */}
          <div className="absolute inset-x-0 bottom-0 p-2.5">
            <h3 className="truncate text-sm font-semibold text-white drop-shadow-lg">
              {result.title}
            </h3>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-white/70">{result.year}</span>
              <span className="text-xs capitalize text-white/50">{result.content_type}</span>
            </div>
          </div>
        </div>

        {/* AI Reason - shown below card */}
        <div className="p-2.5 pt-2">
          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary group-hover:text-text-primary transition-colors">
            {result.reason}
          </p>
        </div>
      </article>
    </Link>
  );
}

// ==========================================================================
// Loading Skeleton
// ==========================================================================

function DiscoverResultsSkeleton() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-lg bg-bg-tertiary" />
        <div className="h-6 w-40 animate-pulse rounded-md bg-bg-tertiary" />
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <CompactCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function CompactCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl bg-bg-secondary/50">
      <div className="aspect-[2/3] animate-pulse bg-bg-tertiary" />
      <div className="p-2.5 pt-2 space-y-1.5">
        <div className="h-3 w-full animate-pulse rounded bg-bg-tertiary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-bg-tertiary" />
      </div>
    </div>
  );
}

// ==========================================================================
// Empty State
// ==========================================================================

interface DiscoverEmptyStateProps {
  hasSearched?: boolean;
}

export function DiscoverEmptyState({ hasSearched = false }: DiscoverEmptyStateProps) {
  if (!hasSearched) {
    return null; // Don't show anything before first search
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-tertiary">
        <Play className="h-8 w-8 text-text-tertiary" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">No matches found</h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        Try adjusting your description or exploring different moods and genres.
      </p>
    </div>
  );
}

export default DiscoverResults;
