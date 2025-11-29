'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Info, Plus, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentTypeBadge } from '@/components/ui';
import { ContentRating } from './ContentRating';
import {
  getBackdropUrl,
  getContentTitle,
  getContentReleaseDate,
  getContentType,
  extractYear,
  cn,
  isMovie,
} from '@/lib/utils';
import type { Content } from '@/types';

// ==========================================================================
// Hero Spotlight Component
// Rotating featured content for the homepage
// ==========================================================================

interface HeroSpotlightProps {
  items: Content[];
  autoRotate?: boolean;
  rotateInterval?: number;
  watchlistIds?: Set<number>;
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
}

export function HeroSpotlight({
  items,
  autoRotate = true,
  rotateInterval = 8000,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: HeroSpotlightProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const itemCount = items.length;
  const currentItem = items[currentIndex];

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [isTransitioning]
  );

  const goToNext = useCallback(() => {
    goToSlide((currentIndex + 1) % itemCount);
  }, [currentIndex, itemCount, goToSlide]);

  const goToPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + itemCount) % itemCount);
  }, [currentIndex, itemCount, goToSlide]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate || itemCount <= 1) return;

    const timer = setInterval(goToNext, rotateInterval);
    return () => clearInterval(timer);
  }, [autoRotate, rotateInterval, itemCount, goToNext]);

  if (!currentItem) {
    return null;
  }

  const title = getContentTitle(currentItem);
  const releaseDate = getContentReleaseDate(currentItem);
  const year = extractYear(releaseDate);
  const contentType = getContentType(currentItem);
  const backdropUrl = getBackdropUrl(currentItem.backdrop_path, 'original');
  const detailUrl = isMovie(currentItem) ? `/movie/${currentItem.id}` : `/tv/${currentItem.id}`;
  const isInWatchlist = watchlistIds?.has(currentItem.id);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onWatchlistToggle?.(currentItem);
  };

  return (
    <section className={cn('relative h-[60vh] min-h-[450px] overflow-hidden sm:h-[70vh] sm:min-h-[500px]', className)}>
      {/* Backdrop Image */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt=""
            fill
            priority
            className={cn(
              'object-cover transition-opacity duration-500',
              isTransitioning ? 'opacity-80' : 'opacity-100'
            )}
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-accent-primary/20 to-badge-anime/20" />
        )}

        {/* Gradient Overlays */}
        <div className="gradient-overlay-left absolute inset-0" />
        <div className="gradient-overlay-bottom absolute inset-0" />
      </div>

      {/* Content */}
      <div className="container relative flex h-full items-end pb-16 sm:items-center sm:pb-0">
        <div className="ml-0 max-w-2xl px-4 sm:ml-8 sm:px-0 lg:ml-16">
          {/* Badge */}
          <div className="mb-2 flex items-center gap-2 sm:mb-4 sm:gap-3">
            <span className="rounded bg-accent-primary px-2 py-0.5 text-xs font-semibold text-white sm:px-3 sm:py-1 sm:text-sm">
              Featured
            </span>
            <ContentTypeBadge type={contentType} size="sm" className="sm:text-sm" />
          </div>

          {/* Title */}
          <h1
            className={cn(
              'text-2xl font-bold text-text-primary sm:text-4xl lg:text-5xl',
              'transition-all duration-500',
              isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            )}
          >
            {title}
          </h1>

          {/* Meta Info */}
          <div className="mt-2 flex items-center gap-3 text-text-secondary sm:mt-4 sm:gap-4">
            {currentItem.vote_average > 0 && (
              <ContentRating rating={currentItem.vote_average} size="md" />
            )}
            {year && <span className="text-base sm:text-lg">{year}</span>}
          </div>

          {/* Overview */}
          <p
            className={cn(
              'mt-3 max-w-xl text-sm text-text-secondary line-clamp-2 sm:mt-4 sm:text-base sm:line-clamp-3 lg:text-lg',
              'transition-all duration-500 delay-100',
              isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            )}
          >
            {currentItem.overview}
          </p>

          {/* Actions */}
          <div
            className={cn(
              'mt-4 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4',
              'transition-all duration-500 delay-200',
              isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
            )}
          >
            <Link
              href={detailUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent-primary px-6 py-3 text-base font-medium shadow-sm transition-colors hover:bg-accent-hover hover:shadow-md sm:px-8 sm:py-4 sm:text-lg"
            >
              <Play className="h-4 w-4 fill-white text-white sm:h-5 sm:w-5" />
              <span className="text-white">Play Trailer</span>
            </Link>

            <Link
              href={detailUrl}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-tertiary px-6 py-3 text-base font-medium transition-colors hover:bg-border-default sm:px-8 sm:py-4 sm:text-lg"
            >
              <Info className="h-4 w-4 text-text-primary sm:h-5 sm:w-5" />
              <span className="text-text-primary">More Info</span>
            </Link>

            <button
              onClick={handleWatchlistClick}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-transparent px-6 py-3 text-base font-medium transition-colors hover:bg-bg-tertiary sm:px-8 sm:py-4 sm:text-lg"
            >
              {isInWatchlist ? (
                <Check className="h-4 w-4 text-success sm:h-5 sm:w-5" />
              ) : (
                <Plus className="h-4 w-4 text-text-secondary sm:h-5 sm:w-5" />
              )}
              <span className={isInWatchlist ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}>
                {isInWatchlist ? 'In Watchlist' : 'Watchlist'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Arrows (Desktop) */}
      {itemCount > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 md:flex lg:opacity-100"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 md:flex lg:opacity-100"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Indicators */}
      {itemCount > 1 && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-8">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300 sm:h-2',
                index === currentIndex
                  ? 'w-6 bg-accent-primary sm:w-8'
                  : 'w-1.5 bg-white/50 hover:bg-white/70 sm:w-2'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
