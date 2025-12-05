'use client';

// ==========================================================================
// Similar Content Page Error Boundary
// Handles errors when loading similar content
// ==========================================================================

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui';
import { logError } from '@/lib/error';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function SimilarError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, { component: 'SimilarPage', action: 'loadSimilar' });
  }, [error]);

  return (
    <div className="container py-12">
      <ErrorState
        error={error}
        title="Unable to Find Similar Content"
        message="We couldn't load recommendations right now. Please try again."
        onRetry={reset}
        size="lg"
      />
    </div>
  );
}
