// ==========================================================================
// Monetag Ad Provider
// Integration with Monetag (PropellerAds) ad network
// ==========================================================================

import type { AdProvider, Ad, AdRequest, AdResponse } from '../types';

// ==========================================================================
// Monetag Configuration
// ==========================================================================

/**
 * Monetag Zone IDs - Get these from your Monetag Publisher dashboard
 * Each ad format requires its own zone ID
 */
export interface MonetAgZoneConfig {
  /** OnClick/Popunder zone ID */
  popunder?: string;
  /** In-Page Push (IPP) zone ID */
  inPagePush?: string;
  /** Vignette Banner zone ID */
  vignetteBanner?: string;
  /** Interstitial zone ID */
  interstitial?: string;
  /** Push Notifications zone ID */
  pushNotifications?: string;
  /** Direct Link zone ID */
  directLink?: string;
}

/**
 * Get zone configuration from environment variables
 */
export function getMonetAgZones(): MonetAgZoneConfig {
  return {
    popunder: process.env.NEXT_PUBLIC_MONETAG_POPUNDER_ZONE,
    inPagePush: process.env.NEXT_PUBLIC_MONETAG_IPP_ZONE,
    vignetteBanner: process.env.NEXT_PUBLIC_MONETAG_VIGNETTE_ZONE,
    interstitial: process.env.NEXT_PUBLIC_MONETAG_INTERSTITIAL_ZONE,
    pushNotifications: process.env.NEXT_PUBLIC_MONETAG_PUSH_ZONE,
    directLink: process.env.NEXT_PUBLIC_MONETAG_DIRECT_LINK_ZONE,
  };
}

// ==========================================================================
// Script URLs
// ==========================================================================

/**
 * Generate Monetag script URLs based on zone IDs
 * These are the standard Monetag script patterns
 */
export function getMonetAgScripts(zones: MonetAgZoneConfig): string[] {
  const scripts: string[] = [];

  // In-Page Push script
  if (zones.inPagePush) {
    scripts.push(
      `//niphaumeenses.net/vignette.min.js?zone=${zones.inPagePush}`
    );
  }

  // Popunder/OnClick script
  if (zones.popunder) {
    scripts.push(
      `//thusjumhua.com/tag.min.js?zone=${zones.popunder}`
    );
  }

  // Vignette Banner script
  if (zones.vignetteBanner) {
    scripts.push(
      `//niphaumeenses.net/vignette.min.js?zone=${zones.vignetteBanner}`
    );
  }

  // Interstitial script
  if (zones.interstitial) {
    scripts.push(
      `//niphaumeenses.net/vignette.min.js?zone=${zones.interstitial}`
    );
  }

  return scripts;
}

// ==========================================================================
// Monetag Provider State
// ==========================================================================

let isInitialized = false;
let scriptsLoaded = false;

// Track which scripts have been loaded to avoid duplicates
const loadedScripts = new Set<string>();

// ==========================================================================
// Script Loading Utilities
// ==========================================================================

/**
 * Load a script dynamically
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Skip if already loaded
    if (loadedScripts.has(src)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.type = 'text/javascript';
    script.setAttribute('data-cfasync', 'false');

    script.onload = () => {
      loadedScripts.add(src);
      resolve();
    };

    script.onerror = () => {
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
}

/**
 * Load all Monetag scripts
 */
async function loadMonetAgScripts(): Promise<void> {
  const zones = getMonetAgZones();
  const scripts = getMonetAgScripts(zones);

  if (scripts.length === 0) {
    console.warn('[Monetag] No zone IDs configured');
    return;
  }

  try {
    await Promise.all(scripts.map(loadScript));
    scriptsLoaded = true;
    console.log('[Monetag] All scripts loaded successfully');
  } catch (error) {
    console.error('[Monetag] Failed to load scripts:', error);
  }
}

// ==========================================================================
// Monetag Provider Implementation
// ==========================================================================

/**
 * Monetag Ad Provider
 *
 * Integrates with Monetag ad network for:
 * - In-Page Push (IPP) banners
 * - Vignette banners
 * - Popunder/OnClick ads
 * - Interstitial ads
 * - Push notifications (requires sw.js in public folder)
 *
 * Setup:
 * 1. Create a Monetag Publisher account at https://monetag.com
 * 2. Create ad zones for each format you want to use
 * 3. Set zone IDs in environment variables
 * 4. Add sw.js to public folder for push notifications
 */
export const MonetAgProvider: AdProvider = {
  name: 'monetag',

  /**
   * Initialize Monetag SDK
   * Loads all configured ad scripts
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      // Server-side - skip initialization
      return;
    }

    if (isInitialized) {
      return;
    }

    try {
      await loadMonetAgScripts();
      isInitialized = true;
      console.log('[Monetag] Provider initialized');
    } catch (error) {
      console.error('[Monetag] Initialization failed:', error);
    }
  },

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return isInitialized && scriptsLoaded;
  },

  /**
   * Request an ad for a placement
   *
   * Note: Monetag ads are typically auto-displayed by their scripts.
   * This method returns a placeholder response since Monetag handles
   * ad display internally.
   */
  async requestAd(request: AdRequest): Promise<AdResponse> {
    // Log request for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monetag] Ad requested:', request);
    }

    const zones = getMonetAgZones();

    // Monetag handles ad display through their scripts
    // Return info about which zone would be used
    switch (request.placement) {
      case 'trailer_preroll':
        // Monetag doesn't have true video pre-roll
        // Could trigger an interstitial instead
        if (zones.interstitial) {
          return {
            ad: {
              id: `monetag-interstitial-${Date.now()}`,
              type: 'preroll',
              format: 'video_preroll',
              skippable: true,
              skipAfter: 5,
              duration: 30,
              title: 'Advertisement',
              advertiser: 'Monetag',
            },
          };
        }
        return { ad: null };

      case 'content_grid':
      case 'search_results':
        // Use In-Page Push for content grid ads
        if (zones.inPagePush) {
          return {
            ad: {
              id: `monetag-ipp-${Date.now()}`,
              type: 'display',
              format: 'native',
              skippable: false,
              title: 'Sponsored',
              advertiser: 'Monetag',
            },
          };
        }
        return { ad: null };

      case 'details_sidebar':
        // Use Vignette for sidebar
        if (zones.vignetteBanner) {
          return {
            ad: {
              id: `monetag-vignette-${Date.now()}`,
              type: 'display',
              format: 'rectangle',
              skippable: false,
              title: 'Sponsored',
              advertiser: 'Monetag',
            },
          };
        }
        return { ad: null };

      default:
        return { ad: null };
    }
  },

  /**
   * Track impression
   * Monetag handles tracking internally through their scripts
   */
  async trackImpression(ad: Ad): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monetag] Impression:', ad.id);
    }
    // Monetag scripts handle impression tracking automatically
  },

  /**
   * Track click
   * Monetag handles click tracking internally
   */
  async trackClick(ad: Ad): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monetag] Click:', ad.id);
    }
    // Monetag scripts handle click tracking automatically
  },

  /**
   * Track skip
   */
  async trackSkip(ad: Ad, watchedSeconds: number): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monetag] Skip:', ad.id, `(${watchedSeconds}s watched)`);
    }
  },

  /**
   * Track completion
   */
  async trackComplete(ad: Ad): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Monetag] Complete:', ad.id);
    }
  },

  /**
   * Clean up resources
   */
  destroy(): void {
    isInitialized = false;
    scriptsLoaded = false;
    console.log('[Monetag] Provider destroyed');
  },
};

export default MonetAgProvider;
