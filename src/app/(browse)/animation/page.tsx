import { Suspense } from 'react';
import { Metadata } from 'next';
import { BrowsePage } from '@/components/browse';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'Browse Animation | FlickPick',
  description:
    'Discover animated movies and TV shows from Disney, Pixar, DreamWorks, and more. Find your next favorite animated feature.',
  openGraph: {
    title: 'Browse Animation | FlickPick',
    description:
      'Discover animated movies and TV shows from Disney, Pixar, DreamWorks, and more. Find your next favorite animated feature.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

function AnimationPageContent() {
  return (
    <BrowsePage
      contentType="animation"
      title="Animation"
      description="Animated movies and series from around the world"
    />
  );
}

export default function AnimationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          <div className="border-b border-border-subtle">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="h-10 w-48 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <SkeletonGrid count={20} columns={5} />
          </div>
        </div>
      }
    >
      <AnimationPageContent />
    </Suspense>
  );
}
