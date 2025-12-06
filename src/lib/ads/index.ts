// ==========================================================================
// Ad System - Main Entry Point
// ==========================================================================

import type { AdProvider } from './types';
import { AD_PROVIDER } from './config';
import { PlaceholderAdProvider } from './providers/placeholder';
import { MonetAgProvider } from './providers/monetag';

// ==========================================================================
// Provider Registry
// ==========================================================================

/**
 * Map of available ad providers
 * Add new providers here when implementing
 */
const PROVIDERS: Record<string, AdProvider> = {
  placeholder: PlaceholderAdProvider,
  monetag: MonetAgProvider,
  // 'google-ima': GoogleIMAProvider,  // Future
  // 'custom': CustomProvider,          // Future
};

// ==========================================================================
// Active Provider
// ==========================================================================

/**
 * Get the active ad provider based on configuration
 */
export function getAdProvider(): AdProvider {
  const provider = PROVIDERS[AD_PROVIDER];

  if (!provider) {
    console.warn(`[Ads] Unknown provider "${AD_PROVIDER}", falling back to placeholder`);
    return PlaceholderAdProvider;
  }

  return provider;
}

/**
 * The currently active ad provider instance
 */
export const adProvider = getAdProvider();

// ==========================================================================
// Convenience Functions
// ==========================================================================

/**
 * Initialize the ad system
 * Call this once when the app starts
 */
export async function initializeAds(): Promise<void> {
  try {
    await adProvider.initialize();
  } catch (error) {
    console.error('[Ads] Failed to initialize:', error);
  }
}

/**
 * Check if the ad system is ready
 */
export function isAdSystemReady(): boolean {
  return adProvider.isReady();
}

// ==========================================================================
// Exports
// ==========================================================================

export * from './types';
export * from './config';
export { PlaceholderAdProvider } from './providers/placeholder';
