'use client';

// ==========================================================================
// Monetag Scripts Component
// Loads Vignette Banner ads (Better Ads Standards compliant)
// ==========================================================================

import Script from 'next/script';
import { useEffect, useState } from 'react';
import { shouldShowAds } from '@/lib/ads/config';

interface MonetAgScriptsProps {
  enabled?: boolean;
}

/**
 * MonetAgScripts
 *
 * Loads Vignette Banner ads which are:
 * - Compliant with Better Ads Standards
 * - UX effective with clean ad feed
 * - Non-intrusive compared to popunders/interstitials
 */
export function MonetAgScripts({ enabled }: MonetAgScriptsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const adsEnabled = enabled ?? shouldShowAds();
  if (!adsEnabled) return null;

  // Don't load ads on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null;
  }

  const vignetteZone = process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE;
  if (!vignetteZone) return null;

  return (
    <Script
      id="monetag-vignette"
      strategy="lazyOnload"
    >
      {`(function(s){s.dataset.zone='${vignetteZone}',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
    </Script>
  );
}

export default MonetAgScripts;
