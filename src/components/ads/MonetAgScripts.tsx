'use client';

// ==========================================================================
// Monetag Scripts Component
// Loads non-intrusive ad formats (no click hijacking)
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
 * Loads respectful ad formats:
 * - Vignette Banner: Native-like banners (Better Ads Standards compliant)
 * - In-Page Push: Corner notification ads
 *
 * Does NOT load click-hijacking formats (popunders, direct links)
 */
export function MonetAgScripts({ enabled }: MonetAgScriptsProps) {
  const [mounted, setMounted] = useState(false);

  const adsEnabled = enabled ?? shouldShowAds();
  const vignetteZone = process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE;
  const ippZone = process.env.NEXT_PUBLIC_MONETAG_IPP_ZONE;

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState in effect
    const frameId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frameId);
  }, []);

  // All early returns after hooks
  if (!mounted) return null;
  if (!adsEnabled) return null;

  // Don't load ads on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null;
  }

  if (!vignetteZone && !ippZone) return null;

  return (
    <>
      {/* Polyfill for Monetag performance marks bug */}
      <Script
        id="monetag-performance-polyfill"
        strategy="beforeInteractive"
      >
        {`
          (function() {
            if (typeof window !== 'undefined' && window.performance && window.performance.mark) {
              // Create missing performance marks that Monetag scripts expect
              try {
                performance.mark('hints:start');
                performance.mark('hidden_iframe:start');
              } catch (e) {
                // Silently fail if marks already exist
              }

              // Patch performance.measure to handle missing marks gracefully
              var originalMeasure = performance.measure;
              performance.measure = function() {
                try {
                  return originalMeasure.apply(this, arguments);
                } catch (e) {
                  // Suppress errors about missing marks
                  if (e.message && e.message.includes('does not exist')) {
                    return null;
                  }
                  throw e;
                }
              };
            }
          })();
        `}
      </Script>

      {/* Vignette Banner - Native-like banners */}
      {vignetteZone && (
        <Script
          id="monetag-vignette"
          strategy="lazyOnload"
        >
          {`(function(s){s.dataset.zone='${vignetteZone}',s.src='https://gizokraijaw.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
        </Script>
      )}

      {/* In-Page Push - Corner notification ads */}
      {ippZone && (
        <Script
          id="monetag-ipp"
          strategy="lazyOnload"
        >
          {`(function(s){s.dataset.zone='${ippZone}',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
        </Script>
      )}
    </>
  );
}

export default MonetAgScripts;
