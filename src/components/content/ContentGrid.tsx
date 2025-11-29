import { ContentCard } from './ContentCard';
import { SkeletonGrid } from '@/components/ui';
import type { Content } from '@/types';

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
  watchlistIds?: Set<number>;
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
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
}: ContentGridProps) {
  // Column class mapping for responsive design
  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  };

  if (isLoading) {
    return <SkeletonGrid count={loadingCount} columns={columns} />;
  }

  if (items.length === 0) {
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
        <ContentCard
          key={item.id}
          content={item}
          priority={index < 6} // Prioritize first row for LCP
          showTypeBadge={showTypeBadge}
          showRating={showRating}
          showYear={showYear}
          isInWatchlist={watchlistIds?.has(item.id)}
          onWatchlistToggle={onWatchlistToggle}
        />
      ))}
    </div>
  );
}

// ==========================================================================
// Infinite Grid (with load more support)
// ==========================================================================

interface InfiniteContentGridProps extends ContentGridProps {
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
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
}: InfiniteContentGridProps) {
  return (
    <div className={className}>
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
      />

      {/* Load More Button / Loading indicator */}
      {hasMore && !isLoading && (
        <div className="mt-8 flex justify-center">
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-accent-primary" />
              <span>Loading more...</span>
            </div>
          ) : (
            <button
              onClick={onLoadMore}
              className="rounded-md border border-border-default bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
            >
              Load More
            </button>
          )}
        </div>
      )}
    </div>
  );
}
