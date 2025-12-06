'use client';

// ==========================================================================
// Monetag Banner Component
// Container for Monetag display ads (In-Page Push, Vignette, etc.)
// ==========================================================================

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { shouldShowAds } from '@/lib/ads/config';

// ==========================================================================
// Types
// ==========================================================================

export type MonetAgBannerType = 'inPagePush' | 'vignette' | 'native';

interface MonetAgBannerProps {
  /** Type of banner to display */
  type?: MonetAgBannerType;
  /** Zone ID override (uses env var if not provided) */
  zoneId?: string;
  /** Additional class names */
  className?: string;
  /** Called when ad loads */
  onLoad?: () => void;
  /** Called on error */
  onError?: (error: string) => void;
}

// ==========================================================================
// Zone ID Helpers
// ==========================================================================

function getZoneIdForType(type: MonetAgBannerType): string | undefined {
  switch (type) {
    case 'inPagePush':
      return process.env.NEXT_PUBLIC_MONETAG_IPP_ZONE;
    case 'vignette':
      return process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE;
    case 'native':
      return process.env.NEXT_PUBLIC_MONETAG_NATIVE_ZONE;
    default:
      return undefined;
  }
}

// ==========================================================================
// Monetag Banner Component
// ==========================================================================

/**
 * MonetAgBanner
 *
 * Renders a container for Monetag display ads. The actual ad content
 * is injected by Monetag's scripts.
 *
 * For In-Page Push ads specifically, Monetag typically auto-positions
 * these as floating elements. This component provides a dedicated
 * container if you want more control over placement.
 *
 * @example
 * // In a content grid (every 12th item)
 * <MonetAgBanner type="native" className="col-span-full" />
 *
 * // In a sidebar
 * <MonetAgBanner type="vignette" className="sticky top-4" />
 */
export function MonetAgBanner({
  type = 'native',
  zoneId,
  className,
  onLoad,
  onError,
}: MonetAgBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get zone ID
  const effectiveZoneId = zoneId || getZoneIdForType(type);

  useEffect(() => {
    if (!shouldShowAds() || !effectiveZoneId) {
      return;
    }

    // Monetag scripts typically auto-inject content
    // We just need to provide the container with the right attributes

    const container = containerRef.current;
    if (!container) return;

    // Mark container for Monetag
    container.setAttribute('data-monetag-zone', effectiveZoneId);
    container.setAttribute('data-monetag-type', type);

    // Simulate load after a delay (Monetag handles actual injection)
    const timer = setTimeout(() => {
      setIsLoaded(true);
      onLoad?.();
    }, 100);

    return () => clearTimeout(timer);
  }, [effectiveZoneId, type, onLoad]);

  // Don't render if ads disabled or no zone ID
  if (!shouldShowAds()) {
    return null;
  }

  if (!effectiveZoneId) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div
          className={cn(
            'flex min-h-[250px] items-center justify-center rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/5 p-4',
            className
          )}
        >
          <p className="text-center text-sm text-yellow-500/70">
            Monetag {type} zone not configured
            <br />
            <span className="text-xs">
              Set NEXT_PUBLIC_MONETAG_{type.toUpperCase()}_ZONE
            </span>
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'monetag-banner relative overflow-hidden',
        // Default sizing based on type
        type === 'vignette' && 'min-h-[250px]',
        type === 'inPagePush' && 'min-h-[90px]',
        type === 'native' && 'min-h-[100px]',
        className
      )}
      data-zone={effectiveZoneId}
    >
      {/* Loading state - shown until Monetag injects content */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-text-tertiary border-t-transparent" />
            <span className="text-xs text-text-tertiary">Loading ad...</span>
          </div>
        </div>
      )}

      {/* Ad label */}
      <div className="absolute left-2 top-2 z-10">
        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
          AD
        </span>
      </div>
    </div>
  );
}

export default MonetAgBanner;
