'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Info, Plus, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentTypeBadge, Tooltip, useToast } from '@/components/ui';
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
// Redesigned with bottom-left info placement for better image visibility
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
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { addToast } = useToast(); // Must be called before any conditional returns

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
  const isTV = !isMovie(currentItem);
  const detailUrl = isTV ? `/tv/${currentItem.id}` : `/movie/${currentItem.id}`;
  const similarUrl = isTV ? `/similar/tv/${currentItem.id}` : `/similar/movie/${currentItem.id}`;
  const isInWatchlist = watchlistIds?.has(currentItem.id);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    addToast({
      type: 'info',
      title: 'Coming Soon',
      message: 'Watchlist feature is coming soon!',
      duration: 3000,
    });
  };

  const handleSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(similarUrl);
  };

  return (
    <section
      className={cn(
        'group relative h-[50vh] min-h-[400px] overflow-hidden sm:h-[60vh] sm:min-h-[450px] md:h-[70vh] md:min-h-[550px]',
        className
      )}
    >
      {/* Backdrop Image - Full visibility */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt={title}
            fill
            priority
            className={cn(
              'object-cover object-center transition-all duration-700',
              isTransitioning ? 'scale-105 opacity-80' : 'scale-100 opacity-100'
            )}
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-bg-secondary via-bg-tertiary to-bg-primary" />
        )}

        {/* Subtle vignette effect for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary/80 via-transparent to-transparent md:from-bg-primary/60" />
        {/* Bottom gradient for content readability */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
      </div>

      {/* Content - Bottom left positioning */}
      <div className="container relative flex h-full flex-col justify-end pb-24 md:pb-16">
        <div className="flex items-end gap-6 px-4 md:px-0">
          {/* Info */}
          <div className="max-w-2xl">
            {/* Badges */}
            <div
              className={cn(
                'mb-2 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2',
                'transition-all duration-500',
                isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              )}
            >
              <span className="rounded-full bg-accent-primary/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs">
                Featured
              </span>
              <ContentTypeBadge type={contentType} size="sm" />
              {currentItem.vote_average > 0 && (
                <ContentRating rating={currentItem.vote_average} size="sm" />
              )}
              {year && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs">
                  {year}
                </span>
              )}
            </div>

            {/* Title */}
            <h1
              className={cn(
                'text-xl font-bold leading-tight text-white drop-shadow-lg sm:text-2xl md:text-3xl lg:text-4xl',
                'transition-all duration-500 delay-75',
                isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              )}
            >
              {title}
            </h1>

            {/* Overview - Hidden on small mobile, visible on larger screens */}
            <p
              className={cn(
                'mt-3 hidden text-sm leading-relaxed text-gray-200 line-clamp-2 sm:block md:text-base md:line-clamp-3',
                'max-w-xl transition-all duration-500 delay-100',
                isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              )}
            >
              {currentItem.overview}
            </p>

            {/* Actions */}
            <div
              className={cn(
                'mt-4 flex flex-wrap items-center gap-2 sm:mt-5 sm:gap-3',
                'transition-all duration-500 delay-150',
                isTransitioning ? 'translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
              )}
            >
              <Link
                href={detailUrl}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black shadow-lg transition-all hover:scale-105 hover:bg-gray-100 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
              >
                <Play className="h-3.5 w-3.5 fill-black sm:h-5 sm:w-5" />
                <span>Play Trailer</span>
              </Link>

              <Link
                href={detailUrl}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all hover:scale-105 hover:bg-white/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
              >
                <Info className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                <span>More Info</span>
              </Link>

              {/* Find Similar Button */}
              <Tooltip content="Find Similar" position="top">
                <button
                  onClick={handleSimilarClick}
                  className="inline-flex items-center justify-center rounded-full border border-border-default bg-bg-secondary p-2 text-text-primary shadow-lg transition-all hover:scale-105 hover:bg-bg-tertiary sm:p-3"
                  aria-label="Find similar content"
                >
                  <Plus className="h-4 w-4 sm:h-6 sm:w-6" />
                </button>
              </Tooltip>

              {/* Watchlist Button */}
              <Tooltip content={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'} position="top">
                <button
                  onClick={handleWatchlistClick}
                  className={cn(
                    'inline-flex items-center justify-center rounded-full border border-border-default bg-bg-secondary p-2 text-text-primary shadow-lg transition-all hover:scale-105 hover:bg-bg-tertiary sm:p-3',
                    isInWatchlist && 'border-accent-primary bg-accent-primary text-white'
                  )}
                  aria-label={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                >
                  <Heart className={cn('h-4 w-4 sm:h-6 sm:w-6', isInWatchlist && 'fill-current')} />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      {itemCount > 1 && (
        <>
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/60 hover:scale-110 group-hover:opacity-100 md:left-4 md:h-12 md:w-12"
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/60 hover:scale-110 group-hover:opacity-100 md:right-4 md:h-12 md:w-12"
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </>
      )}

      {/* Indicators - Moved to bottom right for cleaner look */}
      {itemCount > 1 && (
        <div className="absolute bottom-6 right-4 z-10 flex items-center gap-1.5 md:bottom-8 md:right-8 md:gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                'rounded-full transition-all duration-300',
                index === currentIndex
                  ? 'h-2 w-6 bg-white md:h-2.5 md:w-8'
                  : 'h-2 w-2 bg-white/40 hover:bg-white/60 md:h-2.5 md:w-2.5'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Current slide counter - Optional elegant touch */}
      <div className="absolute bottom-6 left-4 z-10 md:bottom-8 md:left-8">
        <span className="text-xs font-medium text-white/60 md:text-sm">
          {String(currentIndex + 1).padStart(2, '0')} / {String(itemCount).padStart(2, '0')}
        </span>
      </div>
    </section>
  );
}
