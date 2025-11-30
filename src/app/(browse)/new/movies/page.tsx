import { Suspense } from 'react';
import { Metadata } from 'next';
import { NewMoviesPageContent } from './NewMoviesPageContent';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'New Movie Releases | FlickPick',
  description:
    'Discover the latest movie releases. Browse new films from this week, this month, and recent releases with filters for genre, rating, and streaming availability.',
  openGraph: {
    title: 'New Movie Releases | FlickPick',
    description:
      'Discover the latest movie releases. Browse new films from this week, this month, and recent releases.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

export default function NewMoviesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          <div className="border-b border-border-subtle">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="h-10 w-64 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <div className="h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-4">
                <SkeletonGrid count={6} columns={6} />
              </div>
            </div>
            <div>
              <div className="h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-4">
                <SkeletonGrid count={12} columns={6} />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <NewMoviesPageContent />
    </Suspense>
  );
}
