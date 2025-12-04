'use client';

// ==========================================================================
// BlendResults Component
// Display blend recommendations with reasons
// ==========================================================================

import Link from 'next/link';
import { Plus, Check, Star, Zap, Database } from 'lucide-react';
import { ContentPoster } from '@/components/content/ContentPoster';
import { cn } from '@/lib/utils';
import type { ContentType, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

export interface BlendResultItem {
  id: number;
  title: string;
  year: number;
  media_type: 'movie' | 'tv';
  content_type: ContentType;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  blend_reason: string;
}

interface BlendResultsProps {
  results: BlendResultItem[];
  isLoading?: boolean;
  provider?: 'tastedive' | 'gemini';
  watchlistIds?: Set<number>;
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
}

// ==========================================================================
// Provider Info
// ==========================================================================

function getProviderInfo(provider?: string) {
  switch (provider) {
    case 'tastedive':
      return {
        icon: <Zap className="h-4 w-4" />,
        label: 'Blended Results',
        description: 'Combined from your selected titles',
      };
    case 'gemini':
      return {
        icon: <Zap className="h-4 w-4" />,
        label: 'AI Blended',
        description: 'AI-powered combination',
      };
    default:
      return {
        icon: <Database className="h-4 w-4" />,
        label: 'Similar Matches',
        description: 'Related to your selections',
      };
  }
}

// ==========================================================================
// BlendResults Component
// ==========================================================================

export function BlendResults({
  results,
  isLoading = false,
  provider,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: BlendResultsProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <BlendResultsSkeleton />
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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
            {providerInfo.icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {results.length} {providerInfo.label}
            </h2>
            <p className="text-xs text-text-tertiary">{providerInfo.description}</p>
          </div>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {results.map((result, index) => (
          <BlendResultCard
            key={`${result.id}-${result.media_type}`}
            result={result}
            priority={index < 6}
            isInWatchlist={watchlistIds?.has(result.id)}
            onWatchlistToggle={onWatchlistToggle}
          />
        ))}
      </div>
    </div>
  );
}

// ==========================================================================
// BlendResultCard Component
// ==========================================================================

interface BlendResultCardProps {
  result: BlendResultItem;
  priority?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (content: Content) => void;
}

function BlendResultCard({
  result,
  priority = false,
  isInWatchlist = false,
  onWatchlistToggle,
}: BlendResultCardProps) {
  const detailUrl = result.media_type === 'tv' ? `/tv/${result.id}` : `/movie/${result.id}`;

  const asContent: Content = result.media_type === 'movie'
    ? {
        id: result.id,
        media_type: 'movie' as const,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path,
        vote_average: result.vote_average,
        vote_count: 0,
        overview: result.overview,
        popularity: 0,
        original_language: 'en',
        genre_ids: [],
        title: result.title,
        original_title: result.title,
        release_date: `${result.year}-01-01`,
        adult: false,
      }
    : {
        id: result.id,
        media_type: 'tv' as const,
        poster_path: result.poster_path,
        backdrop_path: result.backdrop_path,
        vote_average: result.vote_average,
        vote_count: 0,
        overview: result.overview,
        popularity: 0,
        original_language: 'en',
        genre_ids: [],
        name: result.title,
        original_name: result.title,
        first_air_date: `${result.year}-01-01`,
        number_of_seasons: 1,
        number_of_episodes: 1,
        episode_run_time: [],
        status: 'Ended' as const,
        type: 'Scripted',
      };

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

        {/* Blend reason */}
        <div className="p-2.5 pt-2">
          <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary group-hover:text-text-primary transition-colors">
            {result.blend_reason}
          </p>
        </div>
      </article>
    </Link>
  );
}

// ==========================================================================
// Loading Skeleton
// ==========================================================================

function BlendResultsSkeleton() {
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
          <BlendCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function BlendCardSkeleton() {
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

interface BlendEmptyStateProps {
  hasSearched?: boolean;
}

export function BlendEmptyState({ hasSearched = false }: BlendEmptyStateProps) {
  if (!hasSearched) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-tertiary">
        <Zap className="h-8 w-8 text-text-tertiary" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">No blend results</h3>
      <p className="mt-2 max-w-sm text-sm text-text-secondary">
        We couldn&apos;t find content that blends your selections. Try different titles.
      </p>
    </div>
  );
}

export default BlendResults;
