'use client';

// ==========================================================================
// Monetag Scripts Component
// Loads ONLY respectful banner/display ad scripts
// NO popunders, interstitials, vignettes, or push notifications
// ==========================================================================

import { useEffect, useState } from 'react';
import { shouldShowAds } from '@/lib/ads/config';

// ==========================================================================
// Types
// ==========================================================================

interface MonetAgScriptsProps {
  /** Override the default ads enabled check */
  enabled?: boolean;
}

// ==========================================================================
// Monetag Scripts Component
// ==========================================================================

/**
 * MonetAgScripts
 *
 * This component is intentionally minimal to ensure respectful ad experience.
 * We do NOT load:
 * - MultiTag (auto-enables aggressive formats)
 * - Popunders
 * - Interstitials (full-page blocking ads)
 * - Vignettes (full-page transition ads)
 * - Push notifications
 *
 * Instead, we only use banner/display ads placed in specific locations
 * via the MonetAgBanner component.
 */
export function MonetAgScripts({ enabled }: MonetAgScriptsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if ads are disabled
  if (!mounted) return null;

  const adsEnabled = enabled ?? shouldShowAds();
  if (!adsEnabled) return null;

  // Banner ads are loaded via MonetAgBanner component in specific placements
  // This component now serves only as a placeholder for any global ad initialization
  // that might be needed in the future

  return null;
}

export default MonetAgScripts;
