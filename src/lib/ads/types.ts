// ==========================================================================
// Ad System Types
// Type definitions for the ad provider abstraction layer
// ==========================================================================

// ==========================================================================
// Ad Types
// ==========================================================================

/**
 * Types of ads supported
 */
export type AdType = 'preroll' | 'midroll' | 'postroll' | 'display';

/**
 * Ad placement locations
 */
export type AdPlacement =
  | 'trailer_preroll'      // Before trailer plays
  | 'content_grid'         // In content grids (every N cards)
  | 'details_sidebar'      // On movie/TV detail pages
  | 'search_results';      // In search results

/**
 * Ad format/size
 */
export type AdFormat =
  | 'video_preroll'        // Pre-roll video ad
  | 'leaderboard'          // 728x90
  | 'rectangle'            // 300x250
  | 'native';              // In-feed native ad

// ==========================================================================
// Ad Data
// ==========================================================================

/**
 * Represents a single ad to be displayed
 */
export interface Ad {
  /** Unique identifier for this ad */
  id: string;

  /** Type of ad */
  type: AdType;

  /** Format of the ad */
  format: AdFormat;

  /** Duration in seconds (for video ads) */
  duration?: number;

  /** Time in seconds before skip is allowed (for video ads) */
  skipAfter?: number;

  /** Whether the ad can be skipped */
  skippable: boolean;

  /** Video URL (for video ads) */
  videoUrl?: string;

  /** Click-through URL */
  clickUrl?: string;

  /** Tracking URLs for impressions */
  impressionUrls?: string[];

  /** Image URL (for display ads) */
  imageUrl?: string;

  /** Alt text / title */
  title?: string;

  /** Advertiser name */
  advertiser?: string;
}

/**
 * Request for an ad
 */
export interface AdRequest {
  /** Where the ad will be shown */
  placement: AdPlacement;

  /** Type of content being watched (for targeting) */
  contentType?: 'movie' | 'tv' | 'anime' | 'animation';

  /** Genre IDs (for targeting) */
  genreIds?: number[];

  /** Content ID (for targeting) */
  contentId?: number;
}

/**
 * Response from ad provider
 */
export interface AdResponse {
  /** The ad to display, or null if no ad available */
  ad: Ad | null;

  /** Whether an error occurred */
  error?: string;
}

// ==========================================================================
// Ad Provider Interface
// ==========================================================================

/**
 * Interface that all ad providers must implement
 *
 * To add a new ad provider:
 * 1. Create a new file in lib/ads/providers/
 * 2. Implement this interface
 * 3. Export from lib/ads/providers/index.ts
 * 4. Set AD_PROVIDER in environment variables
 *
 * @example
 * // lib/ads/providers/google-ima.ts
 * export const GoogleIMAProvider: AdProvider = {
 *   name: 'google-ima',
 *   initialize: async () => { ... },
 *   requestAd: async (request) => { ... },
 *   ...
 * };
 */
export interface AdProvider {
  /** Provider name for logging/debugging */
  name: string;

  /**
   * Initialize the ad provider SDK
   * Called once when the app starts
   */
  initialize: () => Promise<void>;

  /**
   * Check if the provider is ready to serve ads
   */
  isReady: () => boolean;

  /**
   * Request an ad for a specific placement
   */
  requestAd: (request: AdRequest) => Promise<AdResponse>;

  /**
   * Track that an ad was viewed/impressed
   */
  trackImpression: (ad: Ad) => Promise<void>;

  /**
   * Track that an ad was clicked
   */
  trackClick: (ad: Ad) => Promise<void>;

  /**
   * Track that an ad was skipped
   */
  trackSkip: (ad: Ad, watchedSeconds: number) => Promise<void>;

  /**
   * Track that an ad completed playing
   */
  trackComplete: (ad: Ad) => Promise<void>;

  /**
   * Clean up resources (called on unmount)
   */
  destroy: () => void;
}

// ==========================================================================
// Ad Player State
// ==========================================================================

/**
 * State of the ad player component
 */
export interface AdPlayerState {
  /** Current state of the ad player */
  status: 'loading' | 'playing' | 'skippable' | 'completed' | 'error' | 'skipped';

  /** The current ad being played */
  currentAd: Ad | null;

  /** Seconds remaining until skip is allowed */
  skipCountdown: number;

  /** Total seconds watched */
  watchedSeconds: number;

  /** Error message if status is 'error' */
  error?: string;
}

// ==========================================================================
// Ad Configuration
// ==========================================================================

/**
 * Configuration for the ad system
 */
export interface AdConfig {
  /** Whether ads are enabled */
  enabled: boolean;

  /** Which provider to use */
  provider: 'placeholder' | 'monetag' | 'google-ima' | 'custom';

  /** Default skip time in seconds (0 = no skip) */
  defaultSkipAfter: number;

  /** Maximum ad duration in seconds */
  maxDuration: number;

  /** Show ads on trailer plays */
  showPrerollAds: boolean;

  /** Show display ads in content grids */
  showDisplayAds: boolean;

  /** Frequency of display ads (every N items) */
  displayAdFrequency: number;

  /** Minimum time between video ads (seconds) */
  videoAdCooldown: number;
}
