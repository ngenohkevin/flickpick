import { Suspense } from 'react';
import { Metadata } from 'next';
import { NewShowsPageContent } from './NewShowsPageContent';
import { SkeletonGrid } from '@/components/ui';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'New TV Shows & Episodes | FlickPick',
  description:
    'Track currently airing TV shows and new episodes. See episode release schedules, season progress, and find out when your favorite shows return.',
  openGraph: {
    title: 'New TV Shows & Episodes | FlickPick',
    description:
      'Track currently airing TV shows and new episodes. See episode release schedules and season progress.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

export default function NewShowsPage() {
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
            <div className="mb-6 flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 animate-pulse rounded-full bg-bg-tertiary"
                />
              ))}
            </div>
            <SkeletonGrid count={12} columns={4} />
          </div>
        </div>
      }
    >
      <NewShowsPageContent />
    </Suspense>
  );
}
