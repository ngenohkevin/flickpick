'use client';

import { useEffect, useRef } from 'react';

/** Room left above the results for the sticky page header. */
const HEADER_OFFSET = 150;

/**
 * When the query changes while the viewer is scrolled into the results,
 * moves straight to the top of the results in one step.
 *
 * Without it the browser decides: a 4-page list replaced by a 1-page one
 * clamps the scroll position and the page lurches. A smooth scroll doesn't
 * help — the new results land mid-animation and the clamp still happens —
 * so the jump is instant. Not run on first render, so it never fights
 * scroll restoration after Back.
 */
export function useScrollToResults<T extends HTMLElement = HTMLDivElement>(queryKey: string) {
  const ref = useRef<T>(null);
  const lastKeyRef = useRef(queryKey);

  useEffect(() => {
    if (lastKeyRef.current === queryKey) return;
    lastKeyRef.current = queryKey;

    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= 0) return; // results already start on screen

    window.scrollTo({ top: Math.max(0, top + window.scrollY - HEADER_OFFSET), behavior: 'instant' });
  }, [queryKey]);

  return ref;
}
