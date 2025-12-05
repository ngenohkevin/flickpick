'use client';

// ==========================================================================
// Blend Page Error Boundary
// Handles errors in content blending
// ==========================================================================

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui';
import { logError } from '@/lib/error';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function BlendError({ error, reset }: ErrorProps) {
  useEffect(() => {
    logError(error, { component: 'BlendPage', action: 'blendContent' });
  }, [error]);

  return (
    <div className="container py-12">
      <ErrorState
        error={error}
        title="Blend Unavailable"
        message="We couldn't blend your selections right now. Please try again."
        onRetry={reset}
        size="lg"
      />
    </div>
  );
}
