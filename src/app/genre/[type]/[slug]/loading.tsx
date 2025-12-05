// ==========================================================================
// Genre Page Loading State
// Displayed during data fetching for genre pages
// ==========================================================================

import { SkeletonMiniHero, SkeletonGrid } from '@/components/ui';

export default function GenreLoading() {
  return (
    <>
      <SkeletonMiniHero />
      <div className="container py-8">
        <SkeletonGrid count={18} columns={6} />
      </div>
    </>
  );
}
