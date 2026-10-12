'use client';

import { Fragment, type ReactNode } from 'react';
import { ContentCard } from './ContentCard';
import { SkeletonGrid } from '@/components/ui';
import { DisplayAdSlot } from '@/components/ads';
import { useInfiniteScroll } from '@/lib/hooks';
import { shouldShowDisplayAds, DISPLAY_AD_CONFIG } from '@/lib/ads/config';
import type { Content } from '@/types';
import { contentWatchlistKey } from '@/stores/watchlist';
import { cn } from '@/lib/utils';

// ==========================================================================
// Content Grid Component
// Responsive grid layout for content cards
// ==========================================================================

interface ContentGridProps {
  items: Content[];
  columns?: 2 | 3 | 4 | 5 | 6;
  showTypeBadge?: boolean;
  showRating?: boolean;
  showYear?: boolean;
  isLoading?: boolean;
  loadingCount?: number;
  watchlistIds?: Set<string>; // watchlistKey() values
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
  /** Enable display ads in the grid (default: false - opt-in only) */
  showAds?: boolean;
  /** Shown instead of the default "No content found" message */
  emptyState?: ReactNode;
}

export function ContentGrid({
  items,
  columns = 6,
  showTypeBadge = true,
  showRating = true,
  showYear = true,
  isLoading = false,
  loadingCount = 12,
  watchlistIds,
  onWatchlistToggle,
  className = '',
  showAds = false,
  emptyState,
}: ContentGridProps) {
  // Column class mapping for responsive design
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  };

  // Determine if ads should be shown (both globally enabled AND opt-in for this grid)
  const displayAds = showAds && shouldShowDisplayAds();
  const adFrequency = DISPLAY_AD_CONFIG.frequency; // Default: 24 items

  if (isLoading) {
    return <SkeletonGrid count={loadingCount} columns={columns} />;
  }

  if (items.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-text-primary">No content found</p>
        <p className="mt-2 text-text-secondary">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className={`grid gap-4 sm:gap-6 ${columnClasses[columns]} ${className}`}>
      {items.map((item, index) => (
        // Movies and TV shows share TMDB's ID space, so key on type + id
        <Fragment key={contentWatchlistKey(item)}>
          <ContentCard
            content={item}
            priority={index < 6} // Prioritize first row for LCP
            showTypeBadge={showTypeBadge}
            showRating={showRating}
            showYear={showYear}
            isInWatchlist={watchlistIds?.has(contentWatchlistKey(item))}
            onWatchlistToggle={onWatchlistToggle}
          />
          {/* Show ad slot after every N items (only if enabled) */}
          {displayAds && (index + 1) % adFrequency === 0 && (
            <DisplayAdSlot
              placement="content_grid"
              index={index}
              className="col-span-2 sm:col-span-2 md:col-span-2"
            />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ==========================================================================
// Infinite Grid (with automatic infinite scroll)
// ==========================================================================

interface InfiniteContentGridProps extends ContentGridProps {
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  /** Show "no more results" message when all content loaded */
  showEndMessage?: boolean;
  /** Custom end message text */
  endMessage?: string;
  /** Enable infinite scroll (auto-load on scroll), otherwise manual button */
  enableInfiniteScroll?: boolean;
  /** Max pages to auto-load before switching to manual "Load More" button (default: 3) */
  maxAutoLoadPages?: number;
  /** Current page number (used with maxAutoLoadPages) */
  currentPage?: number;
  /** Enable display ads in the grid (default: false - opt-in only) */
  showAds?: boolean;
  /**
   * A request failed: 'initial' (nothing loaded) or 'more' (a later page).
   * Shows a Retry button instead of "No content found", and stops infinite
   * scroll from re-requesting the failed page in a loop.
   */
  error?: 'initial' | 'more' | null;
  onRetry?: () => void;
  /**
   * New results are loading and `items` are the previous ones: they stay in
   * place, dimmed, so the page doesn't collapse to a skeleton and jump.
   */
  isRefreshing?: boolean;
}

export function InfiniteContentGrid({
  items,
  columns = 6,
  showTypeBadge = true,
  showRating = true,
  showYear = true,
  isLoading = false,
  loadingCount = 12,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  watchlistIds,
  onWatchlistToggle,
  className = '',
  showEndMessage = true,
  endMessage = "You've reached the end",
  enableInfiniteScroll = true,
  maxAutoLoadPages = 3,
  currentPage = 1,
  showAds = false,
  emptyState,
  error = null,
  onRetry,
  isRefreshing = false,
}: InfiniteContentGridProps) {
  // Determine if we should auto-load or show manual button
  // After maxAutoLoadPages, switch to manual "Load More" to allow footer access
  const shouldAutoLoad = enableInfiniteScroll && currentPage < maxAutoLoadPages;

  // Use infinite scroll hook for automatic loading
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: onLoadMore ?? (() => {}),
    hasMore,
    isLoading: isLoading || isLoadingMore,
    enabled: shouldAutoLoad && !!onLoadMore && !error,
    rootMargin: '600px', // Start loading 600px before reaching the end
  });

  if (error === 'initial' && !isLoading) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-medium text-text-primary">Couldn&apos;t load titles</p>
          <p className="mt-2 text-text-secondary">Something went wrong on our side. Please try again.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(className, 'transition-opacity duration-200', isRefreshing && 'pointer-events-none opacity-50')}
      aria-busy={isRefreshing || isLoading}
    >
      <ContentGrid
        items={items}
        columns={columns}
        showTypeBadge={showTypeBadge}
        showRating={showRating}
        showYear={showYear}
        isLoading={isLoading}
        loadingCount={loadingCount}
        watchlistIds={watchlistIds}
        onWatchlistToggle={onWatchlistToggle}
        showAds={showAds}
        emptyState={emptyState}
      />

      {/* A later page failed: offer a retry instead of looping */}
      {error === 'more' && !isLoadingMore && (
        <div className="mt-8 flex flex-col items-center gap-3">
          <p className="text-sm text-text-secondary">Couldn&apos;t load more titles.</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-md border border-border-default bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
            >
              Try again
            </button>
          )}
        </div>
      )}

      {/* Loading indicator - shows when loading more content */}
      {isLoadingMore && !isLoading && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
            <span>Loading more...</span>
          </div>
        </div>
      )}

      {/* Manual Load More button (when infinite scroll is disabled or after max auto-load pages) */}
      {!shouldAutoLoad && hasMore && !isLoading && !isLoadingMore && !error && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLoadMore}
            className="rounded-md border border-border-default bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
          >
            Load More
          </button>
        </div>
      )}

      {/* End of results message */}
      {!hasMore && !isLoading && !isRefreshing && items.length > 0 && showEndMessage && (
        <div className="mt-8 flex justify-center">
          <p className="text-sm text-text-tertiary">{endMessage}</p>
        </div>
      )}

      {/* Sentinel element for intersection observer */}
      {shouldAutoLoad && hasMore && !isLoading && !error && (
        <div
          ref={sentinelRef}
          className="h-1 w-full"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
