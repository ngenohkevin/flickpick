'use client';

// ==========================================================================
// Browse Pages Error Boundary
// Handles errors when loading browse pages (movies, tv, animation, anime)
// ==========================================================================

import { useEffect } from 'react';
import { TMDBFallback } from '@/components/ui';
import { logError } from '@/lib/error';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BrowseError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, { component: 'BrowsePage', action: 'loadContent' });
  }, [error]);

  return (
    <div className="container py-12">
      <TMDBFallback
        title="Unable to Load Browse Content"
        message="We're having trouble loading content. This is usually a temporary issue."
        onRetry={reset}
        showAlternatives={true}
        size="lg"
      />
    </div>
  );
}
