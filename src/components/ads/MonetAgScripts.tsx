'use client';

// ==========================================================================
// Monetag Scripts Component
// Loads Monetag ad scripts using Next.js Script for optimal loading
// ==========================================================================

import Script from 'next/script';
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
// Zone Configuration
// ==========================================================================

/**
 * Get zone IDs from environment variables
 * These are configured in your Monetag Publisher dashboard
 */
function getZoneIds() {
  return {
    popunder: process.env.NEXT_PUBLIC_MONETAG_POPUNDER_ZONE,
    inPagePush: process.env.NEXT_PUBLIC_MONETAG_IPP_ZONE,
    vignette: process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE,
    interstitial: process.env.NEXT_PUBLIC_MONETAG_INTERSTITIAL_ZONE,
    push: process.env.NEXT_PUBLIC_MONETAG_PUSH_ZONE,
  };
}

// ==========================================================================
// Monetag Scripts Component
// ==========================================================================

/**
 * MonetAgScripts
 *
 * Loads all configured Monetag ad scripts. Place this component in your
 * root layout to enable Monetag ads across your site.
 *
 * Required environment variables:
 * - NEXT_PUBLIC_ADS_ENABLED=true
 * - NEXT_PUBLIC_AD_PROVIDER=monetag
 * - NEXT_PUBLIC_MONETAG_POPUNDER_ZONE=your_zone_id (optional)
 * - NEXT_PUBLIC_MONETAG_IPP_ZONE=your_zone_id (optional)
 * - NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE=your_zone_id (optional)
 * - NEXT_PUBLIC_MONETAG_INTERSTITIAL_ZONE=your_zone_id (optional)
 * - NEXT_PUBLIC_MONETAG_PUSH_ZONE=your_zone_id (optional)
 *
 * For Push Notifications, also add sw.js to your public folder.
 *
 * @example
 * // In app/layout.tsx
 * import { MonetAgScripts } from '@/components/ads';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <MonetAgScripts />
 *       </body>
 *     </html>
 *   );
 * }
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

  // Don't load ads on localhost - they only work on verified domains
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MonetAgScripts] Skipping ad scripts on localhost');
    }
    return null;
  }

  const zones = getZoneIds();
  const multiTagZone = process.env.NEXT_PUBLIC_MONETAG_MULTITAG_ZONE;
  const hasAnyZone = multiTagZone || Object.values(zones).some(Boolean);

  if (!hasAnyZone) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[MonetAgScripts] No zone IDs configured. Set NEXT_PUBLIC_MONETAG_*_ZONE environment variables.'
      );
    }
    return null;
  }

  return (
    <>
      {/* MultiTag - Auto-optimized ad formats */}
      {multiTagZone && (
        <Script
          id="monetag-multitag"
          src="https://quge5.com/88/tag.min.js"
          data-zone={multiTagZone}
          strategy="lazyOnload"
          async
          data-cfasync="false"
        />
      )}

      {/* In-Page Push (Banner-style notifications) */}
      {zones.inPagePush && (
        <Script
          id="monetag-ipp"
          src="//niphaumeenses.net/vignette.min.js"
          data-zone={zones.inPagePush}
          strategy="lazyOnload"
          data-cfasync="false"
        />
      )}

      {/* Push Notifications */}
      {zones.push && (
        <Script
          id="monetag-push"
          strategy="lazyOnload"
          data-cfasync="false"
        >
          {`
            (function(d,z,s){
              s.src='//'+d+'/pfe/current/tag.min.js?z='+z;
              s.setAttribute('data-cfasync','false');
              document.body.appendChild(s);
            })('gloophoudint.net',${zones.push},document.createElement('script'));
          `}
        </Script>
      )}
    </>
  );
}

export default MonetAgScripts;
