// ==========================================================================
// TMDB Discover Functions
// Advanced filtering and discovery for movies and TV shows
// ==========================================================================

import { tmdbFetch, type TMDBResponse } from './client';
import type { TMDBMovie } from './movies';
import type { TMDBTVShow } from './tv';
import { ANIMATION_GENRE_ID } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

export interface DiscoverMovieParams {
  page?: number;
  sort_by?: MovieSortBy;
  // Filters
  with_genres?: string; // Comma-separated genre IDs
  without_genres?: string;
  with_keywords?: string; // Comma-separated keyword IDs
  without_keywords?: string;
  // Date filters
  'primary_release_date.gte'?: string; // YYYY-MM-DD
  'primary_release_date.lte'?: string;
  'release_date.gte'?: string;
  'release_date.lte'?: string;
  year?: number;
  primary_release_year?: number;
  // Rating filters
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'vote_count.gte'?: number;
  'vote_count.lte'?: number;
  // Runtime filters
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;
  // Other filters
  with_original_language?: string; // ISO 639-1 code
  with_origin_country?: string; // ISO 3166-1 code
  with_watch_providers?: string; // Comma-separated provider IDs
  watch_region?: string; // ISO 3166-1 code for provider availability
  with_release_type?: string; // 1-6 or combinations
  include_adult?: boolean;
  include_video?: boolean;
}

export interface DiscoverTVParams {
  page?: number;
  sort_by?: TVSortBy;
  // Filters
  with_genres?: string;
  without_genres?: string;
  with_keywords?: string;
  without_keywords?: string;
  // Date filters
  'first_air_date.gte'?: string;
  'first_air_date.lte'?: string;
  'air_date.gte'?: string;
  'air_date.lte'?: string;
  first_air_date_year?: number;
  // Rating filters
  'vote_average.gte'?: number;
  'vote_average.lte'?: number;
  'vote_count.gte'?: number;
  'vote_count.lte'?: number;
  // Runtime filters
  'with_runtime.gte'?: number;
  'with_runtime.lte'?: number;
  // Other filters
  with_original_language?: string;
  with_origin_country?: string;
  with_watch_providers?: string;
  watch_region?: string;
  with_networks?: string; // Network IDs
  with_status?: string; // 0-5
  with_type?: string; // 0-6
  include_adult?: boolean;
  include_null_first_air_dates?: boolean;
}

export type MovieSortBy =
  | 'popularity.asc'
  | 'popularity.desc'
  | 'revenue.asc'
  | 'revenue.desc'
  | 'primary_release_date.asc'
  | 'primary_release_date.desc'
  | 'vote_average.asc'
  | 'vote_average.desc'
  | 'vote_count.asc'
  | 'vote_count.desc';

export type TVSortBy =
  | 'popularity.asc'
  | 'popularity.desc'
  | 'first_air_date.asc'
  | 'first_air_date.desc'
  | 'vote_average.asc'
  | 'vote_average.desc'
  | 'vote_count.asc'
  | 'vote_count.desc';

// ==========================================================================
// Discover Movies
// ==========================================================================

/**
 * Discover movies with advanced filtering
 */
export async function discoverMovies(
  params: DiscoverMovieParams = {}
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/discover/movie', {
    sort_by: params.sort_by ?? 'popularity.desc',
    include_adult: params.include_adult ?? false,
    include_video: params.include_video ?? false,
    ...params,
  });
}

/**
 * Discover animation movies (Western animation)
 * @param params - Discovery params
 * @param additionalGenres - Optional additional genre IDs to filter by (combined with animation genre)
 */
export async function discoverAnimationMovies(
  params: Omit<DiscoverMovieParams, 'with_genres'> = {},
  additionalGenres?: string
): Promise<TMDBResponse<TMDBMovie>> {
  // Combine animation genre with any additional genre filters
  const genreFilter = additionalGenres
    ? `${ANIMATION_GENRE_ID},${additionalGenres}`
    : String(ANIMATION_GENRE_ID);

  const response = await discoverMovies({
    ...params,
    with_genres: genreFilter,
  });

  // Filter out Japanese animation (that's anime)
  return {
    ...response,
    results: response.results?.filter(
      (movie) => movie.original_language !== 'ja'
    ),
  };
}

/**
 * Discover anime movies (Japanese animation)
 * @param params - Discovery params
 * @param additionalGenres - Optional additional genre IDs to filter by (combined with animation genre)
 */
export async function discoverAnimeMovies(
  params: Omit<DiscoverMovieParams, 'with_genres' | 'with_origin_country'> = {},
  additionalGenres?: string
): Promise<TMDBResponse<TMDBMovie>> {
  // Combine animation genre with any additional genre filters
  const genreFilter = additionalGenres
    ? `${ANIMATION_GENRE_ID},${additionalGenres}`
    : String(ANIMATION_GENRE_ID);

  return discoverMovies({
    ...params,
    with_genres: genreFilter,
    with_original_language: 'ja',
  });
}

// ==========================================================================
// Discover TV Shows
// ==========================================================================

/**
 * Discover TV shows with advanced filtering
 */
export async function discoverTVShows(
  params: DiscoverTVParams = {}
): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/discover/tv', {
    sort_by: params.sort_by ?? 'popularity.desc',
    include_adult: params.include_adult ?? false,
    include_null_first_air_dates: params.include_null_first_air_dates ?? false,
    ...params,
  });
}

/**
 * Discover animation TV shows (Western animation)
 * @param params - Discovery params
 * @param additionalGenres - Optional additional genre IDs to filter by (combined with animation genre)
 */
export async function discoverAnimationTVShows(
  params: Omit<DiscoverTVParams, 'with_genres'> = {},
  additionalGenres?: string
): Promise<TMDBResponse<TMDBTVShow>> {
  // Combine animation genre with any additional genre filters
  const genreFilter = additionalGenres
    ? `${ANIMATION_GENRE_ID},${additionalGenres}`
    : String(ANIMATION_GENRE_ID);

  const response = await discoverTVShows({
    ...params,
    with_genres: genreFilter,
  });

  // Filter out Japanese animation
  return {
    ...response,
    results: response.results?.filter(
      (show) =>
        show.original_language !== 'ja' && !show.origin_country?.includes('JP')
    ),
  };
}

/**
 * Discover anime TV shows (Japanese animation)
 * @param params - Discovery params
 * @param additionalGenres - Optional additional genre IDs to filter by (combined with animation genre)
 */
export async function discoverAnimeTVShows(
  params: Omit<DiscoverTVParams, 'with_genres' | 'with_origin_country'> = {},
  additionalGenres?: string
): Promise<TMDBResponse<TMDBTVShow>> {
  // Combine animation genre with any additional genre filters
  const genreFilter = additionalGenres
    ? `${ANIMATION_GENRE_ID},${additionalGenres}`
    : String(ANIMATION_GENRE_ID);

  return discoverTVShows({
    ...params,
    with_genres: genreFilter,
    with_origin_country: 'JP',
  });
}

// ==========================================================================
// Pre-built Category Queries
// ==========================================================================

/**
 * Get new movie releases (last 30 days)
 */
export async function getNewMovieReleases(
  page: number = 1
): Promise<TMDBResponse<TMDBMovie>> {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  return discoverMovies({
    page,
    sort_by: 'primary_release_date.desc',
    'primary_release_date.lte': today.toISOString().split('T')[0],
    'primary_release_date.gte': thirtyDaysAgo.toISOString().split('T')[0],
    'vote_count.gte': 10, // Minimum votes for quality
  });
}

/**
 * Get hidden gems (high rating, low vote count)
 */
export async function getHiddenGems(
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<TMDBResponse<TMDBMovie | TMDBTVShow>> {
  const params = {
    page,
    sort_by: 'vote_average.desc' as const,
    'vote_average.gte': 7.5,
    'vote_count.gte': 100,
    'vote_count.lte': 1000,
  };

  if (type === 'movie') {
    return discoverMovies(params);
  }
  return discoverTVShows(params);
}

/**
 * Get top rated content
 */
export async function getTopRated(
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<TMDBResponse<TMDBMovie | TMDBTVShow>> {
  const params = {
    page,
    sort_by: 'vote_average.desc' as const,
    'vote_average.gte': 8,
    'vote_count.gte': 1000,
  };

  if (type === 'movie') {
    return discoverMovies(params);
  }
  return discoverTVShows(params);
}

/**
 * Get classic movies (pre-1990, highly rated)
 */
export async function getClassics(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return discoverMovies({
    page,
    sort_by: 'vote_average.desc',
    'primary_release_date.lte': '1990-12-31',
    'vote_average.gte': 7.5,
    'vote_count.gte': 1000,
  });
}

/**
 * Get family-friendly content
 */
export async function getFamilyFriendly(
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<TMDBResponse<TMDBMovie | TMDBTVShow>> {
  // Family (10751) and Animation (16) genres
  const params = {
    page,
    sort_by: 'popularity.desc' as const,
    with_genres: '10751|16', // OR logic
    'vote_average.gte': 6,
  };

  if (type === 'movie') {
    return discoverMovies({ ...params, include_adult: false });
  }
  return discoverTVShows({ ...params, include_adult: false });
}

/**
 * Get international content (non-English)
 */
export async function getInternational(
  type: 'movie' | 'tv' = 'movie',
  page: number = 1
): Promise<TMDBResponse<TMDBMovie | TMDBTVShow>> {
  const params = {
    page,
    sort_by: 'popularity.desc' as const,
    'vote_average.gte': 7,
    'vote_count.gte': 100,
  };

  if (type === 'movie') {
    const response = await discoverMovies(params);
    return {
      ...response,
      results: response.results?.filter((m) => m.original_language !== 'en'),
    };
  }

  const response = await discoverTVShows(params);
  return {
    ...response,
    results: response.results?.filter((s) => s.original_language !== 'en'),
  };
}

// ==========================================================================
// Helper: Build Filter String
// ==========================================================================

/**
 * Build a comma-separated string for TMDB filter params
 */
export function buildFilterString(values: (number | string)[]): string {
  return values.join(',');
}

/**
 * Build an OR filter string (uses | separator)
 */
export function buildOrFilterString(values: (number | string)[]): string {
  return values.join('|');
}
