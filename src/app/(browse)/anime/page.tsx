import { Suspense } from 'react';
import { Metadata } from 'next';
import { BrowsePage } from '@/components/browse';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'Browse Anime | FlickPick',
  description:
    'Discover the best anime movies and series. From classics like Studio Ghibli to the latest seasonal hits, find your next anime obsession.',
  openGraph: {
    title: 'Browse Anime | FlickPick',
    description:
      'Discover the best anime movies and series. From classics like Studio Ghibli to the latest seasonal hits, find your next anime obsession.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

function AnimePageContent() {
  return (
    <BrowsePage
      contentType="anime"
      title="Anime"
      description="Japanese animation movies and series"
    />
  );
}

export default function AnimePage() {
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
      <AnimePageContent />
    </Suspense>
  );
}
