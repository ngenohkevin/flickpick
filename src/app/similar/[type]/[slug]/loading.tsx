// ==========================================================================
// Similar Content Page Loading State
// Displayed during data fetching for similar content pages
// ==========================================================================

import { SkeletonMiniHero, SkeletonGrid } from '@/components/ui';

export default function SimilarLoading() {
  return (
    <>
      <SkeletonMiniHero />
      <div className="container py-8">
        <SkeletonGrid count={12} columns={6} />
      </div>
    </>
  );
}
