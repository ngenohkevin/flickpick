// ==========================================================================
// TMDB Search Functions
// Functions for searching movies, TV shows, and multi-search
// ==========================================================================

import { tmdbFetch, type TMDBResponse } from './client';
import type { TMDBMovie } from './movies';
import type { TMDBTVShow } from './tv';
import type { ContentType, SearchResult } from '@/types';
import { ANIMATION_GENRE_ID } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

export interface TMDBMultiSearchResult {
  id: number;
  media_type: 'movie' | 'tv' | 'person';
  // Movie fields
  title?: string;
  original_title?: string;
  release_date?: string;
  // TV fields
  name?: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
  // Shared fields
  overview?: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  vote_average: number;
  vote_count?: number;
  popularity: number;
  genre_ids?: number[];
  original_language?: string;
  adult?: boolean;
  // Person fields (if media_type is 'person')
  profile_path?: string | null;
  known_for_department?: string;
  known_for?: TMDBMultiSearchResult[];
}

export interface SearchParams {
  query: string;
  page?: number;
  include_adult?: boolean;
  year?: number;
  primary_release_year?: number;
  first_air_date_year?: number;
  region?: string;
}

// ==========================================================================
// Multi-Search (Movies + TV)
// ==========================================================================

/**
 * Search for movies and TV shows together
 */
export async function searchMulti(
  query: string,
  page: number = 1
): Promise<TMDBResponse<TMDBMultiSearchResult>> {
  const response = await tmdbFetch<TMDBResponse<TMDBMultiSearchResult>>('/search/multi', {
    query,
    page,
    include_adult: false,
  });

  // Filter out person results
  return {
    ...response,
    results: response.results?.filter((r) => r.media_type !== 'person') ?? [],
  };
}

/**
 * Search and return formatted results with content types
 */
export async function searchContent(
  query: string,
  page: number = 1,
  limit?: number
): Promise<SearchResult[]> {
  const response = await searchMulti(query, page);
  let results = (response.results ?? [])
    .filter((r): r is TMDBMultiSearchResult & { media_type: 'movie' | 'tv' } =>
      r.media_type === 'movie' || r.media_type === 'tv'
    )
    .map((item) => toSearchResult(item));

  if (limit) {
    results = results.slice(0, limit);
  }

  return results;
}

// ==========================================================================
// Movie Search
// ==========================================================================

/**
 * Search for movies only
 */
export async function searchMovies(
  params: SearchParams
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/search/movie', {
    query: params.query,
    page: params.page ?? 1,
    include_adult: params.include_adult ?? false,
    primary_release_year: params.primary_release_year,
    year: params.year,
    region: params.region,
  });
}

// ==========================================================================
// TV Search
// ==========================================================================

/**
 * Search for TV shows only
 */
export async function searchTVShows(
  params: SearchParams
): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/search/tv', {
    query: params.query,
    page: params.page ?? 1,
    include_adult: params.include_adult ?? false,
    first_air_date_year: params.first_air_date_year,
  });
}

// ==========================================================================
// Content Type Detection
// ==========================================================================

/**
 * Determine the content type from a search result
 */
export function getContentType(item: TMDBMultiSearchResult): ContentType {
  if (item.media_type === 'movie') {
    const genreIds = item.genre_ids ?? [];
    const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
    const isJapanese = item.original_language === 'ja';

    if (isAnimation && isJapanese) return 'anime';
    if (isAnimation) return 'animation';
    return 'movie';
  }

  if (item.media_type === 'tv') {
    const genreIds = item.genre_ids ?? [];
    const originCountry = item.origin_country ?? [];
    const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
    const isJapanese = originCountry.includes('JP') || item.original_language === 'ja';

    if (isAnimation && isJapanese) return 'anime';
    if (isAnimation) return 'animation';
    return 'tv';
  }

  return 'movie'; // Default fallback
}

// ==========================================================================
// Helpers
// ==========================================================================

/**
 * Convert multi-search result to SearchResult type
 */
export function toSearchResult(item: TMDBMultiSearchResult): SearchResult {
  const isMovie = item.media_type === 'movie';

  return {
    id: item.id,
    title: isMovie ? item.title! : item.name!,
    media_type: item.media_type as 'movie' | 'tv',
    poster_path: item.poster_path,
    release_date: isMovie ? item.release_date : undefined,
    first_air_date: !isMovie ? item.first_air_date : undefined,
    vote_average: item.vote_average,
    content_type: getContentType(item),
  };
}

/**
 * Get title from search result (handles both movies and TV)
 */
export function getTitle(item: TMDBMultiSearchResult): string {
  return item.media_type === 'movie' ? item.title ?? '' : item.name ?? '';
}

/**
 * Get release year from search result
 */
export function getReleaseYear(item: TMDBMultiSearchResult): number | undefined {
  const dateStr = item.media_type === 'movie' ? item.release_date : item.first_air_date;
  if (!dateStr) return undefined;

  const year = new Date(dateStr).getFullYear();
  return isNaN(year) ? undefined : year;
}
