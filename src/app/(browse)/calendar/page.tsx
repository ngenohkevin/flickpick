import { Suspense } from 'react';
import { Metadata } from 'next';
import { CalendarPageContent } from './CalendarPageContent';

// ==========================================================================
// Metadata
// ==========================================================================

export const metadata: Metadata = {
  title: 'Release Calendar | FlickPick',
  description:
    'Track upcoming movie releases and TV show episodes. View the release calendar to plan your next watch.',
  openGraph: {
    title: 'Release Calendar | FlickPick',
    description:
      'Track upcoming movie releases and TV show episodes. View the release calendar to plan your next watch.',
    type: 'website',
  },
};

// ==========================================================================
// Page Component
// ==========================================================================

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          {/* Header Skeleton */}
          <div className="border-b border-border-subtle">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="h-10 w-64 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="border-b border-border-subtle bg-bg-secondary/50">
            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-24 animate-pulse rounded-full bg-bg-tertiary"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Skeleton */}
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
                <div className="h-8 w-16 animate-pulse rounded bg-bg-tertiary" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-10 animate-pulse rounded bg-bg-tertiary" />
                <div className="h-10 w-10 animate-pulse rounded bg-bg-tertiary" />
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-bg-tertiary" />
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[100px] animate-pulse rounded-lg border border-border-subtle bg-bg-tertiary"
                />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <CalendarPageContent />
    </Suspense>
  );
}
