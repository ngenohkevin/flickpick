// ==========================================================================
// Watchlist Page Loading State
// Displayed during data fetching for watchlist page
// ==========================================================================

import { Skeleton, SkeletonGrid } from '@/components/ui';

export default function WatchlistLoading() {
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="h-10 w-48 sm:h-12" />
        <Skeleton className="mt-2 h-5 w-64" />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {['All', 'Movies', 'TV Shows', 'Animation', 'Anime'].map((_, i) => (
          <Skeleton key={i} variant="rounded" width={80} height={36} />
        ))}
      </div>

      {/* Sort Controls */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton width={120} height={16} />
        <Skeleton variant="rounded" width={140} height={36} />
      </div>

      {/* Content Grid */}
      <SkeletonGrid count={12} columns={6} />
    </div>
  );
}
