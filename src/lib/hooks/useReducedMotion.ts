'use client';

import { useSyncExternalStore, useCallback } from 'react';

// ==========================================================================
// useReducedMotion Hook
// Detects and responds to user's reduced motion preference
// Uses useSyncExternalStore for safe subscription to browser APIs
// ==========================================================================

const QUERY = '(prefers-reduced-motion: reduce)';

// Server-side fallback - assume no preference
function getServerSnapshot(): boolean {
  return false;
}

// Get current value from the media query
function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/**
 * Hook to detect if the user prefers reduced motion
 * @returns boolean - true if user prefers reduced motion, false otherwise
 *
 * @example
 * ```tsx
 * function AnimatedComponent() {
 *   const prefersReducedMotion = useReducedMotion();
 *
 *   return (
 *     <div className={prefersReducedMotion ? '' : 'animate-fade-in'}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useReducedMotion(): boolean {
  const subscribe = useCallback((callback: () => void) => {
    const mediaQuery = window.matchMedia(QUERY);
    mediaQuery.addEventListener('change', callback);
    return () => {
      mediaQuery.removeEventListener('change', callback);
    };
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Get animation class based on reduced motion preference
 * @param animationClass - The animation class to conditionally apply
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns The animation class or empty string
 *
 * @example
 * ```tsx
 * function Card() {
 *   const prefersReducedMotion = useReducedMotion();
 *   const animation = getAnimationClass('animate-fade-in-up', prefersReducedMotion);
 *
 *   return <div className={animation}>Content</div>;
 * }
 * ```
 */
export function getAnimationClass(
  animationClass: string,
  prefersReducedMotion: boolean
): string {
  return prefersReducedMotion ? '' : animationClass;
}

/**
 * Get transition duration based on reduced motion preference
 * @param duration - Duration in milliseconds
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Duration or 0 if reduced motion is preferred
 */
export function getTransitionDuration(
  duration: number,
  prefersReducedMotion: boolean
): number {
  return prefersReducedMotion ? 0 : duration;
}
