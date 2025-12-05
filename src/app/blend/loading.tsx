// ==========================================================================
// Blend Page Loading State
// Displayed during data fetching for content blend page
// ==========================================================================

import { Skeleton, SkeletonGrid, SkeletonButton } from '@/components/ui';

export default function BlendLoading() {
  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <Skeleton className="mx-auto h-10 w-48 sm:h-12" />
        <Skeleton className="mx-auto mt-3 h-5 w-80 max-w-full" />
      </div>

      {/* Title Selection Area */}
      <div className="mx-auto mb-8 max-w-3xl">
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-6">
          <Skeleton width={140} height={20} className="mb-4" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border-default bg-bg-tertiary p-4">
                <Skeleton variant="rounded" className="aspect-[2/3] w-full" />
                <Skeleton className="mt-2 h-4 w-3/4" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <SkeletonButton />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-12">
        <Skeleton width={160} height={28} className="mb-6" />
        <SkeletonGrid count={6} columns={6} />
      </div>
    </div>
  );
}
