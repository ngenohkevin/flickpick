/**
 * Analytics module for FlickPick
 * Uses Umami for privacy-friendly analytics
 *
 * @see https://umami.is/docs
 */

// Re-export all tracking functions
export {
  trackEvent,
  trackSearch,
  trackSearchResultClick,
  trackDiscoverSearch,
  trackMoodSelect,
  trackBlendSearch,
  trackWatchlistAdd,
  trackWatchlistRemove,
  trackWatchlistPickRandom,
  trackProviderClick,
  trackContentView,
  trackTrailerPlay,
  trackShare,
  trackFilterChange,
  trackCategoryView,
  EVENT_NAMES,
} from './umami';

// Re-export types
export type {
  AnalyticsEvent,
  TrackableEvent,
  EventName,
  SearchEvent,
  SearchResultClickEvent,
  DiscoverSearchEvent,
  MoodSelectEvent,
  BlendSearchEvent,
  WatchlistAddEvent,
  WatchlistRemoveEvent,
  WatchlistPickRandomEvent,
  ProviderClickEvent,
  ContentViewEvent,
  TrailerPlayEvent,
  ShareEvent,
  FilterChangeEvent,
  CategoryViewEvent,
} from './types';
