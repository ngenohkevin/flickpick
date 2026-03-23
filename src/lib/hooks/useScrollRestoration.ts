import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// ==========================================================================
// Scroll Restoration Hook
// Saves and restores scroll position for browse pages with infinite scroll
// ==========================================================================

interface ScrollState {
  scrollY: number;
  loadedPages: number;
  timestamp: number;
}

const SCROLL_STORAGE_PREFIX = 'flickpick-scroll-';
const SCROLL_STATE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a storage key based on pathname and search params
 */
function getStorageKey(pathname: string, searchParams: string): string {
  const key = searchParams ? `${pathname}?${searchParams}` : pathname;
  return `${SCROLL_STORAGE_PREFIX}${key}`;
}

/**
 * Save scroll state to sessionStorage
 */
function saveScrollState(key: string, state: ScrollState): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // sessionStorage might be full or unavailable
  }
}

/**
 * Load scroll state from sessionStorage
 */
function loadScrollState(key: string): ScrollState | null {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const state: ScrollState = JSON.parse(stored);

    // Check if state is expired
    if (Date.now() - state.timestamp > SCROLL_STATE_TTL) {
      sessionStorage.removeItem(key);
      return null;
    }

    return state;
  } catch {
    return null;
  }
}

/**
 * Clear scroll state from sessionStorage
 */
function clearScrollState(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore errors
  }
}

interface UseScrollRestorationOptions {
  /** Current number of loaded pages (for infinite scroll) */
  loadedPages?: number;
  /** Callback to load more pages before restoring scroll */
  onRestorePages?: (pages: number) => Promise<void>;
  /** Whether scroll restoration is enabled */
  enabled?: boolean;
}

interface UseScrollRestorationReturn {
  /** Manually save current scroll position */
  saveScroll: () => void;
  /** Clear saved scroll position */
  clearScroll: () => void;
  /** Whether we're currently restoring scroll */
  isRestoring: boolean;
}

/**
 * Hook for saving and restoring scroll position on browse pages
 *
 * @example
 * ```tsx
 * const { saveScroll } = useScrollRestoration({
 *   loadedPages: page,
 *   onRestorePages: async (pages) => {
 *     for (let i = 2; i <= pages; i++) {
 *       await fetchContent(i, true);
 *     }
 *   },
 * });
 * ```
 */
export function useScrollRestoration({
  loadedPages = 1,
  onRestorePages,
  enabled = true,
}: UseScrollRestorationOptions = {}): UseScrollRestorationReturn {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isRestoringRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const storageKey = getStorageKey(pathname, searchParams.toString());

  // Save scroll position before navigating away
  const saveScroll = useCallback(() => {
    if (!enabled || isRestoringRef.current) return;

    const state: ScrollState = {
      scrollY: window.scrollY,
      loadedPages,
      timestamp: Date.now(),
    };
    saveScrollState(storageKey, state);
  }, [enabled, loadedPages, storageKey]);

  // Clear saved scroll state
  const clearScroll = useCallback(() => {
    clearScrollState(storageKey);
  }, [storageKey]);

  // Save scroll position on beforeunload and visibility change
  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => saveScroll();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveScroll();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, saveScroll]);

  // Save scroll position when clicking links (before navigation)
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');

      // Only save if clicking on a link that navigates within the app
      if (link && link.href && !link.target && !link.href.startsWith('mailto:')) {
        saveScroll();
      }
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [enabled, saveScroll]);

  // Restore scroll position on mount
  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return;

    const savedState = loadScrollState(storageKey);
    if (!savedState || savedState.scrollY === 0) {
      hasRestoredRef.current = true;
      return;
    }

    const restoreScroll = async () => {
      isRestoringRef.current = true;

      try {
        // Set min-height to allow immediate scroll to saved position
        // This prevents the footer from being visible during page restoration
        const targetHeight = savedState.scrollY + window.innerHeight;
        document.documentElement.style.minHeight = `${targetHeight}px`;

        // Scroll immediately so user sees the right area (not the footer)
        window.scrollTo({ top: savedState.scrollY, behavior: 'instant' });

        // If we need to load more pages first
        if (onRestorePages && savedState.loadedPages > 1) {
          await onRestorePages(savedState.loadedPages);
        }

        // Wait for content to render
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Fine-tune scroll position after content renders
        window.scrollTo({
          top: savedState.scrollY,
          behavior: 'instant',
        });

        // Clear saved state after restoration
        clearScrollState(storageKey);
      } finally {
        // Remove min-height override
        document.documentElement.style.minHeight = '';
        isRestoringRef.current = false;
        hasRestoredRef.current = true;
      }
    };

    restoreScroll();
  }, [enabled, storageKey, onRestorePages]);

  // Reset restoration flag when route changes
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [pathname, searchParams]);

  return {
    saveScroll,
    clearScroll,
    isRestoring: isRestoringRef.current,
  };
}
