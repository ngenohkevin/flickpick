// ==========================================================================
// TMDB API Client
// Base client for all TMDB API interactions
// Docs: https://developer.themoviedb.org/docs
// ==========================================================================

import { DEFAULT_LANGUAGE } from '@/lib/constants';

// ==========================================================================
// Configuration
// ==========================================================================

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_ACCESS_TOKEN = process.env.TMDB_ACCESS_TOKEN;

if (!TMDB_ACCESS_TOKEN) {
  console.warn('Warning: TMDB_ACCESS_TOKEN is not set. API calls will fail.');
}

// ==========================================================================
// Types
// ==========================================================================

export interface TMDBResponse<T> {
  page?: number;
  results?: T[];
  total_pages?: number;
  total_results?: number;
}

export interface TMDBError {
  status_code: number;
  status_message: string;
  success: boolean;
}

export type TMDBParams = Record<string, string | number | boolean | undefined>;

// ==========================================================================
// Base Fetch Function
// ==========================================================================

/**
 * Base fetch function for TMDB API
 * Handles authentication, error handling, and response parsing
 */
export async function tmdbFetch<T>(
  endpoint: string,
  params: TMDBParams = {},
  options: RequestInit = {}
): Promise<T> {
  // Build URL with query parameters
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  // Add default language if not specified
  if (!params.language) {
    params.language = DEFAULT_LANGUAGE;
  }

  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });

  // Make request with authentication
  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle errors
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as TMDBError;
    throw new TMDBApiError(
      error.status_message || `TMDB API error: ${response.status}`,
      response.status,
      error.status_code
    );
  }

  return response.json() as Promise<T>;
}

// ==========================================================================
// Error Class
// ==========================================================================

export class TMDBApiError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
    public tmdbCode?: number
  ) {
    super(message);
    this.name = 'TMDBApiError';
  }
}

// ==========================================================================
// Paginated Fetch Helper
// ==========================================================================

/**
 * Fetch multiple pages from a paginated TMDB endpoint
 */
export async function tmdbFetchAllPages<T>(
  endpoint: string,
  params: TMDBParams = {},
  maxPages: number = 5
): Promise<T[]> {
  const results: T[] = [];
  let currentPage = 1;
  let totalPages = 1;

  while (currentPage <= totalPages && currentPage <= maxPages) {
    const response = await tmdbFetch<TMDBResponse<T>>(endpoint, {
      ...params,
      page: currentPage,
    });

    if (response.results) {
      results.push(...response.results);
    }

    totalPages = response.total_pages ?? 1;
    currentPage++;
  }

  return results;
}

// ==========================================================================
// Image URL Helpers
// ==========================================================================

export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'w500' | 'original';

/**
 * Get full URL for a TMDB poster image
 */
export function getPosterUrl(path: string | null, size: PosterSize = 'w500'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Get full URL for a TMDB backdrop image
 */
export function getBackdropUrl(path: string | null, size: BackdropSize = 'w1280'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Get full URL for a TMDB profile image
 */
export function getProfileUrl(path: string | null, size: ProfileSize = 'w185'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Get full URL for a TMDB logo image
 */
export function getLogoUrl(path: string | null, size: LogoSize = 'w154'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
