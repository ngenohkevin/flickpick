// ==========================================================================
// Placeholder Ad Provider
// Development/testing provider that simulates ads without real ad network
// ==========================================================================

import type { AdProvider, Ad, AdRequest, AdResponse } from '../types';
import { PREROLL_CONFIG } from '../config';

// ==========================================================================
// Mock Ad Data
// ==========================================================================

/**
 * Sample pre-roll video ad for development
 * Replace with actual ad content when integrating real provider
 */
const MOCK_PREROLL_AD: Ad = {
  id: 'placeholder-preroll-001',
  type: 'preroll',
  format: 'video_preroll',
  duration: 10, // 10 second placeholder
  skipAfter: PREROLL_CONFIG.skipAfter,
  skippable: true,
  // Using a placeholder video - this would be replaced by real ad
  videoUrl: undefined, // No actual video - component will show placeholder UI
  clickUrl: 'https://flickpick.site',
  title: 'Advertisement',
  advertiser: 'FlickPick',
};

/**
 * Sample display ads for development
 */
const MOCK_DISPLAY_ADS: Ad[] = [
  {
    id: 'placeholder-display-001',
    type: 'display' as const,
    format: 'rectangle',
    skippable: false,
    imageUrl: undefined, // Component will show placeholder
    clickUrl: 'https://flickpick.site',
    title: 'Your Ad Here',
    advertiser: 'Advertise with FlickPick',
  },
  {
    id: 'placeholder-display-002',
    type: 'display' as const,
    format: 'leaderboard',
    skippable: false,
    imageUrl: undefined,
    clickUrl: 'https://flickpick.site',
    title: 'Your Ad Here',
    advertiser: 'Advertise with FlickPick',
  },
];

// ==========================================================================
// Placeholder Provider Implementation
// ==========================================================================

let isInitialized = false;

/**
 * Placeholder Ad Provider
 *
 * This provider is used during development to test the ad system
 * without connecting to a real ad network.
 *
 * Features:
 * - Simulates ad loading delay
 * - Returns mock ad data
 * - Logs all tracking events to console
 *
 * To replace with a real provider:
 * 1. Create a new file (e.g., google-ima.ts)
 * 2. Implement the AdProvider interface
 * 3. Update AD_PROVIDER environment variable
 */
export const PlaceholderAdProvider: AdProvider = {
  name: 'placeholder',

  /**
   * Initialize the placeholder provider
   * In a real provider, this would load the ad SDK
   */
  async initialize(): Promise<void> {
    // Simulate SDK initialization delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    isInitialized = true;
    console.log('[Ads] Placeholder provider initialized');
  },

  /**
   * Check if provider is ready
   */
  isReady(): boolean {
    return isInitialized;
  },

  /**
   * Request an ad for a placement
   */
  async requestAd(request: AdRequest): Promise<AdResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Log the request for debugging
    console.log('[Ads] Ad requested:', request);

    // Return appropriate mock ad based on placement
    switch (request.placement) {
      case 'trailer_preroll':
        return {
          ad: { ...MOCK_PREROLL_AD, id: `preroll-${Date.now()}` },
        };

      case 'content_grid':
      case 'details_sidebar':
      case 'search_results':
        // Randomly select a display ad
        const displayAd = MOCK_DISPLAY_ADS[Math.floor(Math.random() * MOCK_DISPLAY_ADS.length)];
        return {
          ad: displayAd ? { ...displayAd, id: `display-${Date.now()}` } : null,
        };

      default:
        return { ad: null };
    }
  },

  /**
   * Track ad impression
   */
  async trackImpression(ad: Ad): Promise<void> {
    console.log('[Ads] Impression tracked:', ad.id);
    // In a real provider, this would fire tracking pixels
  },

  /**
   * Track ad click
   */
  async trackClick(ad: Ad): Promise<void> {
    console.log('[Ads] Click tracked:', ad.id);
    // In a real provider, this would fire click tracking
  },

  /**
   * Track ad skip
   */
  async trackSkip(ad: Ad, watchedSeconds: number): Promise<void> {
    console.log('[Ads] Skip tracked:', ad.id, `(watched ${watchedSeconds}s)`);
    // In a real provider, this would report skip event
  },

  /**
   * Track ad completion
   */
  async trackComplete(ad: Ad): Promise<void> {
    console.log('[Ads] Complete tracked:', ad.id);
    // In a real provider, this would report completion
  },

  /**
   * Clean up resources
   */
  destroy(): void {
    isInitialized = false;
    console.log('[Ads] Placeholder provider destroyed');
  },
};

export default PlaceholderAdProvider;
