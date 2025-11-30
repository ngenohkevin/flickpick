import { Suspense } from 'react';
import { Metadata } from 'next';
import { BrowsePage } from '@/components/browse';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'Browse TV Shows | FlickPick',
  description:
    'Discover and browse thousands of TV series. Filter by genre, year, rating, and more to find your next binge-worthy show.',
  openGraph: {
    title: 'Browse TV Shows | FlickPick',
    description:
      'Discover and browse thousands of TV series. Filter by genre, year, rating, and more to find your next binge-worthy show.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

function TVPageContent() {
  return (
    <BrowsePage
      contentType="tv"
      title="TV Shows"
      description="Find your next binge-worthy series"
    />
  );
}

export default function TVPage() {
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
      <TVPageContent />
    </Suspense>
  );
}
