/**
 * Umami Analytics Client
 * Provides type-safe event tracking for FlickPick
 *
 * @see https://umami.is/docs/track-events
 */

import type { EventName, TrackableEvent } from './types';

// Check if analytics is enabled (only in production with valid config)
const isAnalyticsEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;

  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

  return Boolean(websiteId && umamiUrl && window.umami);
};

/**
 * Track a custom event with Umami
 * Events are only sent in production when analytics is properly configured
 */
export function trackEvent<T extends TrackableEvent>(
  eventName: T['name'],
  data?: T['data']
): void {
  if (!isAnalyticsEnabled()) {
    // Log in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', eventName, data);
    }
    return;
  }

  try {
    window.umami?.track(eventName, data);
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.error('[Analytics] Failed to track event:', error);
  }
}

// Convenience functions for specific event types

/**
 * Track a search event
 */
export function trackSearch(
  query: string,
  type: 'all' | 'movie' | 'tv',
  resultsCount: number
): void {
  trackEvent('search', {
    query: query.slice(0, 100), // Truncate long queries
    type,
    results_count: resultsCount,
  });
}

/**
 * Track when a user clicks a search result
 */
export function trackSearchResultClick(
  query: string,
  contentId: number,
  contentType: 'movie' | 'tv',
  position: number
): void {
  trackEvent('search_result_click', {
    query: query.slice(0, 100),
    content_id: contentId,
    content_type: contentType,
    position,
  });
}

/**
 * Track AI discovery searches
 */
export function trackDiscoverSearch(
  prompt: string,
  contentType: 'all' | 'movie' | 'tv' | 'animation' | 'anime',
  provider: 'gemini' | 'tastedive' | 'tmdb',
  resultsCount: number
): void {
  trackEvent('discover_search', {
    prompt: prompt.slice(0, 200), // Truncate long prompts
    content_type: contentType,
    provider,
    results_count: resultsCount,
  });
}

/**
 * Track mood-based browsing
 */
export function trackMoodSelect(mood: string, resultsCount: number): void {
  trackEvent('mood_select', {
    mood,
    results_count: resultsCount,
  });
}

/**
 * Track blend feature usage
 */
export function trackBlendSearch(titles: string[], resultsCount: number): void {
  trackEvent('blend_search', {
    titles: titles.join(', ').slice(0, 200),
    results_count: resultsCount,
  });
}

/**
 * Track adding to watchlist
 */
export function trackWatchlistAdd(
  contentId: number,
  contentType: 'movie' | 'tv',
  title: string
): void {
  trackEvent('watchlist_add', {
    content_id: contentId,
    content_type: contentType,
    title: title.slice(0, 100),
  });
}

/**
 * Track removing from watchlist
 */
export function trackWatchlistRemove(
  contentId: number,
  contentType: 'movie' | 'tv',
  title: string
): void {
  trackEvent('watchlist_remove', {
    content_id: contentId,
    content_type: contentType,
    title: title.slice(0, 100),
  });
}

/**
 * Track "Pick for me" random selection
 */
export function trackWatchlistPickRandom(
  filter: 'all' | 'movie' | 'tv' | 'animation' | 'anime',
  pickedId: number,
  pickedTitle: string
): void {
  trackEvent('watchlist_pick_random', {
    filter,
    picked_id: pickedId,
    picked_title: pickedTitle.slice(0, 100),
  });
}

/**
 * Track streaming provider clicks
 */
export function trackProviderClick(
  providerName: string,
  providerId: number,
  contentId: number,
  contentType: 'movie' | 'tv',
  watchType: 'stream' | 'rent' | 'buy'
): void {
  trackEvent('provider_click', {
    provider_name: providerName,
    provider_id: providerId,
    content_id: contentId,
    content_type: contentType,
    watch_type: watchType,
  });
}

/**
 * Track content detail page views
 */
export function trackContentView(
  contentId: number,
  contentType: 'movie' | 'tv',
  title: string
): void {
  trackEvent('content_view', {
    content_id: contentId,
    content_type: contentType,
    title: title.slice(0, 100),
  });
}

/**
 * Track trailer plays
 */
export function trackTrailerPlay(
  contentId: number,
  contentType: 'movie' | 'tv',
  title: string,
  videoKey: string
): void {
  trackEvent('trailer_play', {
    content_id: contentId,
    content_type: contentType,
    title: title.slice(0, 100),
    video_key: videoKey,
  });
}

/**
 * Track content sharing
 */
export function trackShare(
  contentId: number,
  contentType: 'movie' | 'tv',
  title: string,
  method: 'native' | 'copy_link' | 'twitter' | 'facebook'
): void {
  trackEvent('share', {
    content_id: contentId,
    content_type: contentType,
    title: title.slice(0, 100),
    method,
  });
}

/**
 * Track filter changes on browse pages
 */
export function trackFilterChange(
  page: string,
  filterType: 'genre' | 'year' | 'rating' | 'sort' | 'provider',
  filterValue: string
): void {
  trackEvent('filter_change', {
    page,
    filter_type: filterType,
    filter_value: filterValue,
  });
}

/**
 * Track category page views
 */
export function trackCategoryView(
  category: string,
  contentType?: 'movie' | 'tv' | 'all'
): void {
  trackEvent('category_view', {
    category,
    ...(contentType && { content_type: contentType }),
  });
}

// Export all event names for reference
export const EVENT_NAMES: EventName[] = [
  'search',
  'search_result_click',
  'discover_search',
  'mood_select',
  'blend_search',
  'watchlist_add',
  'watchlist_remove',
  'watchlist_pick_random',
  'provider_click',
  'content_view',
  'trailer_play',
  'share',
  'filter_change',
  'category_view',
];
