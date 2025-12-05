// ==========================================================================
// Mood Page Loading State
// Displayed during data fetching for mood-based browsing pages
// ==========================================================================

import { SkeletonMiniHero, SkeletonGrid } from '@/components/ui';

export default function MoodLoading() {
  return (
    <>
      <SkeletonMiniHero />
      <div className="container py-8">
        <SkeletonGrid count={18} columns={6} />
      </div>
    </>
  );
}
