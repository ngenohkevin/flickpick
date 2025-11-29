'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentCard } from './ContentCard';
import { SkeletonRow } from '@/components/ui';
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

      {/* Scrollable Container */}
      <div className="group relative">
        {/* Scroll Buttons (hidden on mobile) */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated shadow-lg text-text-primary opacity-0 transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated shadow-lg text-text-primary opacity-0 transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

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

      {/* Scrollable Container */}
      <div className="group relative">
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated shadow-lg text-text-primary opacity-0 transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated shadow-lg text-text-primary opacity-0 transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

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
