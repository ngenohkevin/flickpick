'use client';

// ==========================================================================
// Monetag Scripts Component
// DISABLED - All Monetag ad formats are too aggressive
// ==========================================================================

import { shouldShowAds } from '@/lib/ads/config';

interface MonetAgScriptsProps {
  enabled?: boolean;
}

/**
 * MonetAgScripts
 *
 * Currently DISABLED because all Monetag formats are too intrusive:
 * - MultiTag: Auto-enables popunders, interstitials, etc.
 * - Popunders: Click anywhere opens new window (BAD UX)
 * - Interstitials: Full-page blocking ads
 * - Vignettes: Full-page transition ads
 * - In-Page Push: Floating notifications
 *
 * Consider using Google AdSense or similar for respectful banner ads.
 */
export function MonetAgScripts({ enabled }: MonetAgScriptsProps) {
  // All Monetag ads disabled - they're too aggressive
  return null;
}

export default MonetAgScripts;
