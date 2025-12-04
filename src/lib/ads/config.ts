// ==========================================================================
// Ad System Configuration
// Centralized configuration for the ad system
// ==========================================================================

import type { AdConfig } from './types';

// ==========================================================================
// Environment Variables
// ==========================================================================

/**
 * Whether ads are enabled (set via environment variable)
 * Set NEXT_PUBLIC_ADS_ENABLED=true to enable ads
 */
export const ADS_ENABLED = process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';

/**
 * Which ad provider to use
 * Options: 'placeholder' | 'google-ima' | 'custom'
 */
export const AD_PROVIDER = (process.env.NEXT_PUBLIC_AD_PROVIDER || 'placeholder') as
  | 'placeholder'
  | 'google-ima'
  | 'custom';

// ==========================================================================
// Default Configuration
// ==========================================================================

/**
 * Default ad configuration
 * Can be overridden per-environment
 */
export const DEFAULT_AD_CONFIG: AdConfig = {
  // Master switch for ads
  enabled: ADS_ENABLED,

  // Which provider to use
  provider: AD_PROVIDER,

  // Skip button appears after 5 seconds
  defaultSkipAfter: 5,

  // Maximum ad duration (30 seconds)
  maxDuration: 30,

  // Show pre-roll ads before trailers
  showPrerollAds: true,

  // Show display ads in content grids
  showDisplayAds: true,

  // Show a display ad every 12 items in grids
  displayAdFrequency: 12,

  // Minimum 5 minutes between video ads per session
  videoAdCooldown: 300,
};

// ==========================================================================
// Ad Timing Constants
// ==========================================================================

/**
 * Pre-roll ad timing configuration
 */
export const PREROLL_CONFIG = {
  /** Seconds before skip button appears */
  skipAfter: 5,

  /** Maximum ad duration in seconds */
  maxDuration: 30,

  /** Minimum ad duration in seconds */
  minDuration: 5,
} as const;

/**
 * Display ad configuration
 */
export const DISPLAY_AD_CONFIG = {
  /** Show ad after every N content cards */
  frequency: 12,

  /** Supported sizes */
  sizes: {
    leaderboard: { width: 728, height: 90 },
    rectangle: { width: 300, height: 250 },
    native: { width: 'auto', height: 'auto' },
  },
} as const;

// ==========================================================================
// Ad Placements
// ==========================================================================

/**
 * Defines where ads can appear in the app
 */
export const AD_PLACEMENTS = {
  /** Pre-roll before trailers */
  TRAILER_PREROLL: 'trailer_preroll',

  /** In content grids (homepage, browse pages) */
  CONTENT_GRID: 'content_grid',

  /** Sidebar on detail pages */
  DETAILS_SIDEBAR: 'details_sidebar',

  /** In search results */
  SEARCH_RESULTS: 'search_results',
} as const;

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Check if ads should be shown
 * Respects user preferences and environment settings
 */
export function shouldShowAds(): boolean {
  // Check environment flag
  if (!ADS_ENABLED) return false;

  // Could add more checks here:
  // - User subscription status
  // - Ad blocker detection
  // - Regional restrictions

  return true;
}

/**
 * Check if pre-roll ads should be shown for trailers
 */
export function shouldShowPrerollAds(): boolean {
  return shouldShowAds() && DEFAULT_AD_CONFIG.showPrerollAds;
}

/**
 * Check if display ads should be shown in grids
 */
export function shouldShowDisplayAds(): boolean {
  return shouldShowAds() && DEFAULT_AD_CONFIG.showDisplayAds;
}

/**
 * Get the current ad configuration
 * Merges defaults with any runtime overrides
 */
export function getAdConfig(): AdConfig {
  return {
    ...DEFAULT_AD_CONFIG,
    enabled: ADS_ENABLED,
    provider: AD_PROVIDER,
  };
}
