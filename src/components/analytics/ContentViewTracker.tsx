'use client';

import { useEffect, useRef } from 'react';
import { trackContentView } from '@/lib/analytics';

interface ContentViewTrackerProps {
  contentId: number;
  contentType: 'movie' | 'tv';
  title: string;
}

/**
 * Client component that tracks content page views
 * Use this in Server Components to track when users view movie/TV detail pages
 */
export function ContentViewTracker({
  contentId,
  contentType,
  title,
}: ContentViewTrackerProps) {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!hasTracked.current) {
      trackContentView(contentId, contentType, title);
      hasTracked.current = true;
    }
  }, [contentId, contentType, title]);

  // This component doesn't render anything
  return null;
}
