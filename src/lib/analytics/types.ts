/**
 * Analytics event types for FlickPick
 * Used with Umami analytics for tracking user interactions
 */

// Base event interface
export interface AnalyticsEvent {
  name: string;
  data?: Record<string, string | number | boolean>;
}

// Search events
export interface SearchEvent extends AnalyticsEvent {
  name: 'search';
  data: {
    query: string;
    type: 'all' | 'movie' | 'tv';
    results_count: number;
  };
}

export interface SearchResultClickEvent extends AnalyticsEvent {
  name: 'search_result_click';
  data: {
    query: string;
    content_id: number;
    content_type: 'movie' | 'tv';
    position: number;
  };
}

// AI Discovery events
export interface DiscoverSearchEvent extends AnalyticsEvent {
  name: 'discover_search';
  data: {
    prompt: string;
    content_type: 'all' | 'movie' | 'tv' | 'animation' | 'anime';
    provider: 'gemini' | 'tastedive' | 'tmdb';
    results_count: number;
  };
}

export interface MoodSelectEvent extends AnalyticsEvent {
  name: 'mood_select';
  data: {
    mood: string;
    results_count: number;
  };
}

export interface BlendSearchEvent extends AnalyticsEvent {
  name: 'blend_search';
  data: {
    titles: string;
    results_count: number;
  };
}

// Watchlist events
export interface WatchlistAddEvent extends AnalyticsEvent {
  name: 'watchlist_add';
  data: {
    content_id: number;
    content_type: 'movie' | 'tv';
    title: string;
  };
}

export interface WatchlistRemoveEvent extends AnalyticsEvent {
  name: 'watchlist_remove';
  data: {
    content_id: number;
    content_type: 'movie' | 'tv';
    title: string;
  };
}

export interface WatchlistPickRandomEvent extends AnalyticsEvent {
  name: 'watchlist_pick_random';
  data: {
    filter: 'all' | 'movie' | 'tv' | 'animation' | 'anime';
    picked_id: number;
    picked_title: string;
  };
}

// Provider/Streaming events
export interface ProviderClickEvent extends AnalyticsEvent {
  name: 'provider_click';
  data: {
    provider_name: string;
    provider_id: number;
    content_id: number;
    content_type: 'movie' | 'tv';
    watch_type: 'stream' | 'rent' | 'buy';
  };
}

// Content interaction events
export interface ContentViewEvent extends AnalyticsEvent {
  name: 'content_view';
  data: {
    content_id: number;
    content_type: 'movie' | 'tv';
    title: string;
  };
}

export interface TrailerPlayEvent extends AnalyticsEvent {
  name: 'trailer_play';
  data: {
    content_id: number;
    content_type: 'movie' | 'tv';
    title: string;
    video_key: string;
  };
}

export interface ShareEvent extends AnalyticsEvent {
  name: 'share';
  data: {
    content_id: number;
    content_type: 'movie' | 'tv';
    title: string;
    method: 'native' | 'copy_link' | 'twitter' | 'facebook';
  };
}

// Browse/Filter events
export interface FilterChangeEvent extends AnalyticsEvent {
  name: 'filter_change';
  data: {
    page: string;
    filter_type: 'genre' | 'year' | 'rating' | 'sort' | 'provider';
    filter_value: string;
  };
}

export interface CategoryViewEvent extends AnalyticsEvent {
  name: 'category_view';
  data: {
    category: string;
    content_type?: 'movie' | 'tv' | 'all';
  };
}

// Union type of all events
export type TrackableEvent =
  | SearchEvent
  | SearchResultClickEvent
  | DiscoverSearchEvent
  | MoodSelectEvent
  | BlendSearchEvent
  | WatchlistAddEvent
  | WatchlistRemoveEvent
  | WatchlistPickRandomEvent
  | ProviderClickEvent
  | ContentViewEvent
  | TrailerPlayEvent
  | ShareEvent
  | FilterChangeEvent
  | CategoryViewEvent;

// Event names for type safety
export type EventName = TrackableEvent['name'];

// Umami global interface
declare global {
  interface Window {
    umami?: {
      track: (
        event: string | ((props: { website: string; hostname: string }) => Record<string, unknown>),
        data?: Record<string, string | number | boolean>
      ) => void;
    };
  }
}
