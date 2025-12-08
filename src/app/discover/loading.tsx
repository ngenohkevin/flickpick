// ==========================================================================
// Discover Page Loading State
// Displayed during data fetching for AI discovery page
// ==========================================================================

import { Skeleton, SkeletonGrid, SkeletonButton } from '@/components/ui';

export default function DiscoverLoading() {
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-10 w-64 sm:h-12" />
        <Skeleton className="mx-auto mt-3 h-5 w-96 max-w-full" />
      </div>

      {/* Prompt Input Area */}
      <div className="mx-auto mb-8 max-w-2xl">
        <Skeleton variant="rounded" className="h-32 w-full" />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[110, 130, 100, 140].map((width, i) => (
            <Skeleton key={i} variant="rounded" width={width} height={32} />
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <SkeletonButton />
        </div>
      </div>

      {/* Content Type Tabs */}
      <div className="mb-6 flex justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={70} height={36} />
        ))}
      </div>

      {/* Results Grid */}
      <SkeletonGrid count={12} columns={6} />
    </div>
  );
}
