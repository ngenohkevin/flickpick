import { Suspense } from 'react';
import { Metadata } from 'next';
import { BrowsePage } from '@/components/browse';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'Browse Movies | FlickPick',
  description:
    'Discover and browse thousands of movies. Filter by genre, year, rating, and more to find your next favorite film.',
  openGraph: {
    title: 'Browse Movies | FlickPick',
    description:
      'Discover and browse thousands of movies. Filter by genre, year, rating, and more to find your next favorite film.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

function MoviesPageContent() {
  return (
    <BrowsePage
      contentType="movie"
      title="Movies"
      description="Discover your next favorite film"
    />
  );
}

export default function MoviesPage() {
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
      <MoviesPageContent />
    </Suspense>
  );
}
