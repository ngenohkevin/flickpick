'use client';

// ==========================================================================
// TV Show Detail Page Error Boundary
// Handles errors when loading TV show details
// ==========================================================================

import { useEffect } from 'react';
import { ContentNotFound, ErrorState } from '@/components/ui';
import { logError, classifyError } from '@/lib/error';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function TVShowError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, { component: 'TVShowPage', action: 'loadDetails' });
  }, [error]);

  const appError = classifyError(error);

  // Show content not found for 404 errors
  if (appError.code === 'NOT_FOUND') {
    return <ContentNotFound type="tv" />;
  }

  // Show generic error state for other errors
  return (
    <div className="container py-12">
      <ErrorState
        error={error}
        onRetry={reset}
        size="lg"
      />
    </div>
  );
}
