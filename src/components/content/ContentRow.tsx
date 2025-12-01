'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentCard } from './ContentCard';
import { SkeletonRow } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Content } from '@/types';

// ==========================================================================
// Content Row Component
// Horizontal scrolling row of content cards
// ==========================================================================

interface ContentRowProps {
  title: string;
  items: Content[];
  href?: string;
  showViewAll?: boolean;
  showTypeBadge?: boolean;
  showRating?: boolean;
  isLoading?: boolean;
  loadingCount?: number;
  watchlistIds?: Set<number>;
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
}

export function ContentRow({
  title,
  items,
  href,
  showViewAll = true,
  showTypeBadge = true,
  showRating = true,
  isLoading = false,
  loadingCount = 6,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: ContentRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position and update button visibility
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Only show scroll buttons if there's actual overflow
    if (maxScroll <= 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    // Account for padding offset caused by -mx-* and px-* classes (up to 32px at lg breakpoint)
    const paddingOffset = 40;

    // Left button: only show if we've scrolled past the initial padding
    setCanScrollLeft(scrollLeft > paddingOffset);
    // Right button: only show if we haven't reached the end
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, []);

  // Initialize and listen for scroll/resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Use requestAnimationFrame to ensure DOM is painted before measuring
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
  }, [updateScrollButtons, items]);

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
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          {title}
        </h2>
        {showViewAll && href && (
          <Link
            href={href}
            className="text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scrollable Container - using group/row to isolate from card hover */}
      <div className="group/row relative">
        {/* Scroll Buttons (hidden on mobile, only show when scrollable) */}
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
        {isLoading ? (
          <SkeletonRow count={loadingCount} />
        ) : (
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                className="w-36 flex-shrink-0 snap-start sm:w-44 md:w-48"
              >
                <ContentCard
                  content={item}
                  priority={index < 4}
                  showTypeBadge={showTypeBadge}
                  showRating={showRating}
                  isInWatchlist={watchlistIds?.has(item.id)}
                  onWatchlistToggle={onWatchlistToggle}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ==========================================================================
// Featured Content Row (Larger cards, fewer items)
// ==========================================================================

interface FeaturedContentRowProps {
  title: string;
  items: Content[];
  href?: string;
  showViewAll?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function FeaturedContentRow({
  title,
  items,
  href,
  showViewAll = true,
  isLoading = false,
  className = '',
}: FeaturedContentRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position and update button visibility
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    // Only show scroll buttons if there's actual overflow
    if (maxScroll <= 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    // Account for padding offset caused by -mx-* and px-* classes (up to 32px at lg breakpoint)
    const paddingOffset = 40;

    // Left button: only show if we've scrolled past the initial padding
    setCanScrollLeft(scrollLeft > paddingOffset);
    // Right button: only show if we haven't reached the end
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, []);

  // Initialize and listen for scroll/resize
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
  }, [updateScrollButtons, items]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          {title}
        </h2>
        {showViewAll && href && (
          <Link
            href={href}
            className="text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scrollable Container - using group/row to isolate from card hover */}
      <div className="group/row relative">
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

        {isLoading ? (
          <SkeletonRow count={4} />
        ) : (
          <div
            ref={scrollContainerRef}
            className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            {items.map((item, index) => (
              <div
                key={item.id}
                className="w-52 flex-shrink-0 snap-start sm:w-60 md:w-72"
              >
                <ContentCard
                  content={item}
                  priority={index < 3}
                  showTypeBadge={true}
                  showRating={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
