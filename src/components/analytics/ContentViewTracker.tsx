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
  // Keyed on the title, not a once-only flag: moving from one movie page to
  // another can reuse this component, and the second view went untracked
  const trackedKey = useRef<string | null>(null);

  useEffect(() => {
    const key = `${contentType}:${contentId}`;
    if (trackedKey.current !== key) {
      trackContentView(contentId, contentType, title);
      trackedKey.current = key;
    }
  }, [contentId, contentType, title]);

  // This component doesn't render anything
  return null;
}
