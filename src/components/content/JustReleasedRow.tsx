'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Zap, Plus, Heart } from 'lucide-react';
import { ContentPoster } from './ContentPoster';
import { ContentRating } from './ContentRating';
import { Tooltip, useToast } from '@/components/ui';
import {
  extractYear,
  cn,
} from '@/lib/utils';
import type { MovieWithAvailability } from '@/lib/torrentio';

// ==========================================================================
// Just Released Row Component
// Shows Torrentio-verified available movies with quality badges
// ==========================================================================

interface JustReleasedRowProps {
  movies: MovieWithAvailability[];
  watchlistIds?: Set<number>;
  onWatchlistToggle?: (movie: MovieWithAvailability) => void;
  className?: string;
}

export function JustReleasedRow({
  movies,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: JustReleasedRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const paddingOffset = 40;
    setCanScrollLeft(scrollLeft > paddingOffset);
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(() => {
      updateScrollButtons();
    });

    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, movies]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            Just Released
          </h2>
          <span className="flex items-center gap-1.5 rounded-full bg-success/20 px-2.5 py-1 text-xs font-medium text-success">
            <Zap className="h-3 w-3" />
            Available Now
          </span>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="group/row relative">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={cn(
              'absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
              'rounded-full bg-bg-elevated shadow-lg text-text-primary',
              'opacity-0 transition-opacity hover:bg-bg-tertiary group-hover/row:opacity-100 md:flex'
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={cn(
              'absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
              'rounded-full bg-bg-elevated shadow-lg text-text-primary',
              'opacity-0 transition-opacity hover:bg-bg-tertiary group-hover/row:opacity-100 md:flex'
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {movies.map((movie, index) => (
            <div
              key={movie.id}
              className="w-36 flex-shrink-0 snap-start sm:w-44 md:w-48"
            >
              <JustReleasedCard
                movie={movie}
                priority={index < 4}
                isInWatchlist={watchlistIds?.has(movie.id)}
                onWatchlistToggle={onWatchlistToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Just Released Card Component
// Similar to ContentCard but with availability badge
// ==========================================================================

interface JustReleasedCardProps {
  movie: MovieWithAvailability;
  priority?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (movie: MovieWithAvailability) => void;
  className?: string;
}

function JustReleasedCard({
  movie,
  priority = false,
  isInWatchlist = false,
  onWatchlistToggle,
  className = '',
}: JustReleasedCardProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const year = extractYear(movie.release_date);
  const detailUrl = `/movie/${movie.id}`;
  const similarUrl = `/similar/movie/${movie.id}`;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToast({
      type: 'info',
      title: 'Coming Soon',
      message: 'Watchlist feature is coming soon!',
      duration: 3000,
    });
  };

  const handleSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(similarUrl);
  };

  // Determine quality badge color
  const getQualityBadgeColor = (quality: string | null) => {
    if (!quality) return 'bg-success/20 text-success';
    if (quality === '2160p' || quality === '4K') return 'bg-badge-anime/20 text-badge-anime';
    if (quality === '1080p') return 'bg-accent-primary/20 text-accent-primary';
    return 'bg-success/20 text-success';
  };

  return (
    <article
      className={cn(
        'group/card relative overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary',
        'transition-all duration-200 hover:border-success/50 hover:shadow-lg hover:shadow-success/10 hover:-translate-y-1',
        className
      )}
    >
      <Link href={detailUrl} className="block">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <ContentPoster
            path={movie.poster_path}
            alt={movie.title}
            size="medium"
            priority={priority}
            fill
            className="transition-transform duration-300 group-hover/card:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100" />

          {/* Quick Actions (visible on hover) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
            {/* Find Similar Button */}
            <Tooltip content="Find Similar" position="top">
              <button
                onClick={handleSimilarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-success"
                aria-label="Find similar movies"
              >
                <Plus className="h-5 w-5" />
              </button>
            </Tooltip>

            {/* Watchlist Button */}
            <Tooltip content={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'} position="top">
              <button
                onClick={handleWatchlistClick}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  isInWatchlist
                    ? 'bg-accent-primary text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
                aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <Heart className={cn('h-5 w-5', isInWatchlist && 'fill-current')} />
              </button>
            </Tooltip>
          </div>

          {/* Quality & HDR Badge (top-left) */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <span className={cn(
              'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:text-xs',
              getQualityBadgeColor(movie.availability.bestQuality)
            )}>
              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {movie.availability.bestQuality || '4K'}
              {movie.availability.hasHDR && ' HDR'}
            </span>
          </div>

          {/* Audio Codec Badge (top-right) */}
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
            {movie.availability.audioCodec && (
              <span className="rounded bg-badge-anime/80 px-1.5 py-0.5 text-[9px] font-bold text-white sm:text-[10px]">
                {movie.availability.audioCodec}
              </span>
            )}
            {movie.availability.sources.length > 0 && (
              <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white sm:text-[10px]">
                {movie.availability.sources[0]}
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {movie.vote_average > 0 && (
            <div className="absolute bottom-2 right-2">
              <ContentRating rating={movie.vote_average} size="sm" variant="badge" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="p-2">
          <h3 className="truncate text-[13px] font-medium text-text-primary group-hover/card:text-success">
            {movie.title}
          </h3>
          <div className="mt-0.5 flex items-center justify-between">
            {year && (
              <p className="text-[11px] text-text-tertiary">{year}</p>
            )}
            <span className="text-[10px] text-success">
              {movie.availability.streamCount}+ sources
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
