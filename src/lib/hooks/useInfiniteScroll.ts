// ==========================================================================
// useInfiniteScroll Hook
// Automatically triggers loading when user scrolls near the bottom
// Uses Intersection Observer for performant scroll detection
// ==========================================================================

import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  /** Callback to load more content */
  onLoadMore: () => void;
  /** Whether there's more content to load */
  hasMore: boolean;
  /** Whether content is currently loading */
  isLoading: boolean;
  /** Root margin for intersection observer (how early to trigger) */
  rootMargin?: string;
  /** Threshold for intersection observer */
  threshold?: number;
  /** Whether infinite scroll is enabled */
  enabled?: boolean;
}

interface UseInfiniteScrollReturn {
  /** Ref to attach to the sentinel element */
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  /** Whether the sentinel is currently visible */
  isIntersecting: boolean;
}

export function useInfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  rootMargin = '400px',
  threshold = 0,
  enabled = true,
}: UseInfiniteScrollOptions): UseInfiniteScrollReturn {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isIntersectingRef = useRef(false);

  // Memoize the callback to prevent unnecessary re-subscriptions
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const entry = entries[0];
      if (!entry) return;

      isIntersectingRef.current = entry.isIntersecting;

      // Trigger load if:
      // - Element is intersecting
      // - Not currently loading
      // - There's more content to load
      // - Infinite scroll is enabled
      if (entry.isIntersecting && !isLoading && hasMore && enabled) {
        onLoadMore();
      }
    },
    [onLoadMore, hasMore, isLoading, enabled]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;

    // Don't observe if infinite scroll is disabled or no sentinel
    if (!sentinel || !enabled) {
      return;
    }

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin,
      threshold,
    });

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleIntersect, rootMargin, threshold, enabled]);

  return {
    sentinelRef,
    isIntersecting: isIntersectingRef.current,
  };
}

export default useInfiniteScroll;
