// ==========================================================================
// TasteDive API Types
// TypeScript interfaces for TasteDive recommendation API
// ==========================================================================

// ==========================================================================
// API Response Types
// ==========================================================================

/**
 * TasteDive API response wrapper
 * Note: TasteDive API returns capitalized keys (Similar, Info, Results)
 */
export interface TasteDiveResponse {
  Similar: {
    Info: TasteDiveInfoItem[];
    Results: TasteDiveResult[];
  };
}

/**
 * Info about the queried item(s)
 * Note: TasteDive API returns capitalized Name and Type keys
 */
export interface TasteDiveInfoItem {
  Name: string;
  Type: TasteDiveType;
}

/**
 * Individual result from TasteDive
 * Note: TasteDive API returns capitalized Name and Type keys
 */
export interface TasteDiveResult {
  Name: string;
  Type: TasteDiveType;
  wTeaser?: string;       // Wikipedia description
  wUrl?: string;          // Wikipedia URL
  yUrl?: string;          // YouTube trailer URL
  yID?: string;           // YouTube video ID
}

/**
 * TasteDive content types
 */
export type TasteDiveType = 'movie' | 'show' | 'music' | 'book' | 'game' | 'podcast' | 'author';

// ==========================================================================
// Request Types
// ==========================================================================

/**
 * Parameters for TasteDive API request
 */
export interface TasteDiveParams {
  /** Comma-separated titles with optional type prefix (e.g., "movie:inception") */
  q: string;
  /** Result type filter */
  type?: TasteDiveType;
  /** Set to 1 for descriptions + YouTube links */
  info?: '0' | '1';
  /** Max results (default: 20) */
  limit?: number;
  /** API key */
  k: string;
}

// ==========================================================================
// Internal Types
// ==========================================================================

/**
 * Our normalized type (before TMDB enrichment)
 */
export type NormalizedType = 'movie' | 'tv';

/**
 * TasteDive result mapped to our format (before TMDB enrichment)
 */
export interface TasteDiveMatch {
  name: string;
  type: NormalizedType;
  description?: string;
  wikipediaUrl?: string;
  youtubeUrl?: string;
  youtubeId?: string;
}

// ==========================================================================
// Enriched Types (after TMDB matching)
// ==========================================================================

/**
 * TasteDive result enriched with TMDB data
 */
export interface EnrichedTasteDiveResult {
  id: number;
  title: string;
  year: number;
  media_type: 'movie' | 'tv';
  content_type: 'movie' | 'tv' | 'animation' | 'anime';
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  overview: string;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  // TasteDive-specific data
  tastedive_description?: string;
  youtube_url?: string;
}

// ==========================================================================
// Cache Keys
// ==========================================================================

export const TASTEDIVE_CACHE_PREFIX = 'tastedive:';

export const tasteDiveCacheKeys = {
  similar: (type: NormalizedType, name: string) =>
    `${TASTEDIVE_CACHE_PREFIX}similar:${type}:${name.toLowerCase().replace(/\s+/g, '-')}`,
  similarEnriched: (type: NormalizedType, name: string) =>
    `${TASTEDIVE_CACHE_PREFIX}similar-enriched:${type}:${name.toLowerCase().replace(/\s+/g, '-')}`,
  blend: (names: string[]) =>
    `${TASTEDIVE_CACHE_PREFIX}blend:${names.map(n => n.toLowerCase().replace(/\s+/g, '-')).sort().join('+')}`,
  blendEnriched: (names: string[]) =>
    `${TASTEDIVE_CACHE_PREFIX}blend-enriched:${names.map(n => n.toLowerCase().replace(/\s+/g, '-')).sort().join('+')}`,
  rateLimit: () => `${TASTEDIVE_CACHE_PREFIX}rate_limit`,
};

// ==========================================================================
// Configuration
// ==========================================================================

export const TASTEDIVE_CONFIG = {
  /** Base API URL */
  BASE_URL: 'https://tastedive.com/api/similar',
  /** Rate limit: 300 requests per hour */
  RATE_LIMIT_REQUESTS: 300,
  /** Rate limit window in seconds (1 hour) */
  RATE_LIMIT_WINDOW: 3600,
  /** Cache TTL in seconds (7 days - similar content rarely changes) */
  CACHE_TTL: 604800,
  /** Enriched cache TTL in seconds (7 days) */
  ENRICHED_CACHE_TTL: 604800,
  /** Default result limit */
  DEFAULT_LIMIT: 20,
  /** Request timeout in ms */
  REQUEST_TIMEOUT: 10000,
} as const;
