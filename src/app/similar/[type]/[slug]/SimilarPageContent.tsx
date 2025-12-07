'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SimilarHero, WhyPeopleLove, RelatedGenres } from '@/components/similar';
import { ContentGrid } from '@/components/content/ContentGrid';
import { SkeletonGrid } from '@/components/ui';
import { Film, Tv, Sparkles, Clapperboard, Calendar, Star, ArrowUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Movie, TVShow, Genre, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SimilarPageContentProps {
  type: 'movie' | 'tv';
  contentId: number;
}

type YearFilter = 'all' | '5' | '10' | '20' | '30';
type RatingFilter = 'all' | '6' | '7' | '8';
type SortOption = 'relevance' | 'rating' | 'year-desc' | 'year-asc';

// Content type options with colors
const CONTENT_TYPE_OPTIONS = [
  { type: 'movie' as ContentType, label: 'Movies', icon: Film, color: 'purple' },
  { type: 'tv' as ContentType, label: 'TV Shows', icon: Tv, color: 'cyan' },
  { type: 'animation' as ContentType, label: 'Animation', icon: Clapperboard, color: 'orange' },
  { type: 'anime' as ContentType, label: 'Anime', icon: Sparkles, color: 'pink' },
];

// Year filter options
const YEAR_OPTIONS = [
  { value: 'all' as YearFilter, label: 'All Time' },
  { value: '5' as YearFilter, label: 'Last 5 Years' },
  { value: '10' as YearFilter, label: 'Last 10 Years' },
  { value: '20' as YearFilter, label: 'Last 20 Years' },
];

// Rating filter options
const RATING_OPTIONS = [
  { value: 'all' as RatingFilter, label: 'Any Rating' },
  { value: '6' as RatingFilter, label: '6+ ★' },
  { value: '7' as RatingFilter, label: '7+ ★' },
  { value: '8' as RatingFilter, label: '8+ ★' },
];

// Sort options
const SORT_OPTIONS = [
  { value: 'relevance' as SortOption, label: 'Most Relevant' },
  { value: 'rating' as SortOption, label: 'Highest Rated' },
  { value: 'year-desc' as SortOption, label: 'Newest First' },
  { value: 'year-asc' as SortOption, label: 'Oldest First' },
];

interface SimilarContentData {
  source: {
    id: number;
    title: string;
    overview: string;
    tagline?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
    runtime?: number;
    genres: Genre[];
    content_type: ContentType;
    media_type: 'movie' | 'tv';
    number_of_seasons?: number;
    number_of_episodes?: number;
    status?: string;
  };
  similar: Array<Movie | TVShow>;
  traits: string[];
  related_genres: Genre[];
}

// ==========================================================================
// SimilarPageContent Component
// ==========================================================================

// Helper to extract year from date string or item
function getItemYear(item: Movie | TVShow): number {
  // Check for movie release_date first, then TV first_air_date
  // Need to check for truthy values, not just property existence
  let dateStr: string | undefined;

  if ('release_date' in item && item.release_date) {
    dateStr = item.release_date;
  } else if ('first_air_date' in item && item.first_air_date) {
    dateStr = item.first_air_date;
  }

  if (!dateStr) return 0;
  return parseInt(dateStr.slice(0, 4), 10) || 0;
}

export function SimilarPageContent({ type, contentId }: SimilarPageContentProps) {
  const [data, setData] = useState<SimilarContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType[]>([]);
  const [yearFilter, setYearFilter] = useState<YearFilter>('all');
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('relevance');

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/similar/${type}/${contentId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Content not found');
          }
          throw new Error('Failed to fetch similar content');
        }

        const result: SimilarContentData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [type, contentId]);

  // Helper to get content type from item
  const getItemContentType = (item: Movie | TVShow): ContentType => {
    // Cast to access media_type which the API always sets
    const itemWithMediaType = item as { media_type?: 'movie' | 'tv' };
    const mediaType = itemWithMediaType.media_type;

    // Check for animation genre (ID 16)
    const isAnimation = item.genre_ids?.includes(16);

    // Check for Japanese origin
    const isJapanese = item.original_language === 'ja' ||
      ('origin_country' in item && Array.isArray((item as TVShow).origin_country) &&
        (item as TVShow).origin_country?.includes('JP'));

    // Use media_type as the primary indicator
    const isTV = mediaType === 'tv';
    const isMovie = mediaType === 'movie';

    // For animation/anime, still need to check genre
    if (isAnimation && isJapanese) return 'anime';
    if (isAnimation) return 'animation';

    // Return based on media_type
    if (isTV) return 'tv';
    if (isMovie) return 'movie';

    // Fallback detection if media_type is somehow missing
    if ('first_air_date' in item && item.first_air_date) return 'tv';
    return 'movie';
  };

  // Filter and sort the similar items
  const filteredSimilar = useMemo(() => {
    if (!data?.similar) return [];

    const currentYear = new Date().getFullYear();

    let filtered = data.similar.filter((item) => {
      const itemYear = getItemYear(item);
      const itemContentType = getItemContentType(item);

      // Content type filter
      if (contentTypeFilter.length > 0) {
        if (!contentTypeFilter.includes(itemContentType)) return false;
      }

      // Year filter
      if (yearFilter !== 'all') {
        const yearsBack = parseInt(yearFilter, 10);
        const minYear = currentYear - yearsBack;
        if (itemYear < minYear) return false;
      }

      // Rating filter
      if (ratingFilter !== 'all') {
        const minRating = parseInt(ratingFilter, 10);
        if (item.vote_average < minRating) return false;
      }

      // Streaming filter - skip for now as we don't have provider data
      // Will need to add provider data to similar API

      return true;
    });

    // Sort
    if (sortOption === 'rating') {
      filtered = [...filtered].sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortOption === 'year-desc') {
      filtered = [...filtered].sort((a, b) => getItemYear(b) - getItemYear(a));
    } else if (sortOption === 'year-asc') {
      filtered = [...filtered].sort((a, b) => getItemYear(a) - getItemYear(b));
    }
    // 'relevance' keeps original order

    return filtered;
  }, [data?.similar, contentTypeFilter, yearFilter, ratingFilter, sortOption]);

  // Check if any filters are active
  const hasActiveFilters = contentTypeFilter.length > 0 || yearFilter !== 'all' || ratingFilter !== 'all' || sortOption !== 'relevance';

  // Reset all filters
  const resetFilters = () => {
    setContentTypeFilter([]);
    setYearFilter('all');
    setRatingFilter('all');
    setSortOption('relevance');
  };

  // Toggle content type
  const toggleContentType = (ct: ContentType) => {
    if (contentTypeFilter.includes(ct)) {
      setContentTypeFilter(contentTypeFilter.filter(t => t !== ct));
    } else {
      setContentTypeFilter([...contentTypeFilter, ct]);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            {error === 'Content not found' ? 'Content Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-text-secondary mb-6">
            {error === 'Content not found'
              ? "We couldn't find the content you're looking for."
              : 'Failed to load similar content. Please try again.'}
          </p>
          <Link
            href={type === 'movie' ? '/movies' : '/tv'}
            className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Browse {type === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </div>
      </div>
    );
  }

  const { source, similar, traits, related_genres } = data;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <SimilarHero
        id={source.id}
        title={source.title}
        overview={source.overview}
        tagline={source.tagline}
        posterPath={source.poster_path}
        backdropPath={source.backdrop_path}
        releaseDate={source.release_date}
        voteAverage={source.vote_average}
        voteCount={source.vote_count}
        runtime={source.runtime}
        genres={source.genres}
        contentType={source.content_type}
        mediaType={source.media_type}
        numberOfSeasons={source.number_of_seasons}
      />

      {/* Main Content */}
      <div className="container py-8 sm:py-12">
        {/* Why People Love Section */}
        {traits.length > 0 && (
          <WhyPeopleLove
            title={source.title}
            traits={traits}
            className="mb-10"
          />
        )}

        {/* Similar Content Section */}
        <section className="mb-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              If You Liked {source.title}, Try These
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-tertiary">
                {filteredSimilar.length === similar.length
                  ? `${similar.length} results`
                  : `${filteredSimilar.length} of ${similar.length}`}
              </span>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 rounded-full border border-border-default bg-bg-tertiary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar - Always visible */}
          <div className="mb-6 space-y-4 rounded-xl border border-border-subtle bg-bg-secondary/50 p-4">
            {/* Content Type Filter */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <Film className="h-3.5 w-3.5" />
                Type
              </span>
              <button
                onClick={() => setContentTypeFilter([])}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                  contentTypeFilter.length === 0
                    ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                    : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
                )}
              >
                All
              </button>
              {CONTENT_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = contentTypeFilter.includes(opt.type);
                const colorClasses = {
                  purple: isSelected ? 'border-purple-500/30 bg-purple-500/15 text-purple-400' : '',
                  cyan: isSelected ? 'border-cyan-500/30 bg-cyan-500/15 text-cyan-400' : '',
                  orange: isSelected ? 'border-orange-500/30 bg-orange-500/15 text-orange-400' : '',
                  pink: isSelected ? 'border-pink-500/30 bg-pink-500/15 text-pink-400' : '',
                };
                return (
                  <button
                    key={opt.type}
                    onClick={() => toggleContentType(opt.type)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      isSelected
                        ? colorClasses[opt.color as keyof typeof colorClasses]
                        : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Year & Rating Filters */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Year Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                  <Calendar className="h-3.5 w-3.5" />
                  Released
                </span>
                {YEAR_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setYearFilter(opt.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      yearFilter === opt.value
                        ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                        : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="hidden sm:block h-6 w-px bg-border-subtle" />

              {/* Rating Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                  <Star className="h-3.5 w-3.5" />
                  Rating
                </span>
                {RATING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRatingFilter(opt.value)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                      ratingFilter === opt.value
                        ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
                        : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 border-t border-border-subtle pt-4">
              <span className="mr-1 flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Sort by
              </span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortOption(opt.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    sortOption === opt.value
                      ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                      : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Grid */}
          {filteredSimilar.length > 0 ? (
            <ContentGrid items={filteredSimilar} columns={6} showTypeBadge showRating />
          ) : similar.length > 0 ? (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-8 text-center">
              <p className="text-text-secondary mb-4">
                No results match your filters.
              </p>
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-8 text-center">
              <p className="text-text-secondary">
                No similar content found. Try exploring by genre instead.
              </p>
            </div>
          )}
        </section>

        {/* Related Genres Section */}
        {related_genres.length > 0 && (
          <RelatedGenres
            genres={related_genres}
            mediaType={source.media_type}
            className="mb-10"
          />
        )}

        {/* More Actions */}
        <div className="flex flex-wrap gap-4 border-t border-border-subtle pt-8">
          <Link
            href={source.media_type === 'movie' ? `/movie/${source.id}` : `/tv/${source.id}`}
            className="rounded-md bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
          >
            View Full Details
          </Link>
          <Link
            href={source.media_type === 'movie' ? '/movies' : '/tv'}
            className="rounded-md border border-border-default bg-transparent px-6 py-3 font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            Browse All {source.media_type === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Loading Skeleton
// ==========================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Skeleton */}
      <div className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0 bg-bg-tertiary animate-pulse" />
        <div className="container relative pt-32 pb-8">
          <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse mb-6" />
          <div className="flex gap-10">
            <div className="hidden lg:block w-48 h-72 bg-bg-secondary rounded-lg animate-pulse" />
            <div className="flex-1 space-y-4">
              <div className="h-6 w-24 bg-bg-secondary rounded animate-pulse" />
              <div className="h-10 w-96 max-w-full bg-bg-secondary rounded animate-pulse" />
              <div className="h-4 w-64 max-w-full bg-bg-secondary rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-bg-secondary rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-bg-secondary rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="container py-8">
        <div className="h-6 w-64 bg-bg-tertiary rounded animate-pulse mb-4" />
        <div className="grid sm:grid-cols-3 gap-3 mb-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-bg-tertiary rounded-lg animate-pulse" />
          ))}
        </div>

        <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-6" />
        <SkeletonGrid count={12} columns={6} />
      </div>
    </div>
  );
}
