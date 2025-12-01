// ==========================================================================
// FlickPick Utility Functions
// ==========================================================================

import {
  TMDB_IMAGE_BASE_URL,
  POSTER_SIZES,
  BACKDROP_SIZES,
  PROFILE_SIZES,
  ANIMATION_GENRE_ID,
} from './constants';
import type { Content, ContentType, Movie, TVShow } from '@/types';

// ==========================================================================
// Image URL Helpers
// ==========================================================================

/**
 * Get the full URL for a TMDB poster image
 */
export function getPosterUrl(
  path: string | null,
  size: keyof typeof POSTER_SIZES = 'medium'
): string {
  if (!path) return '/placeholder-poster.svg';
  return `${TMDB_IMAGE_BASE_URL}/${POSTER_SIZES[size]}${path}`;
}

/**
 * Get the full URL for a TMDB backdrop image
 */
export function getBackdropUrl(
  path: string | null,
  size: keyof typeof BACKDROP_SIZES = 'large'
): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${BACKDROP_SIZES[size]}${path}`;
}

/**
 * Get the full URL for a TMDB profile image
 */
export function getProfileUrl(
  path: string | null,
  size: keyof typeof PROFILE_SIZES = 'medium'
): string {
  if (!path) return '/placeholder-profile.svg';
  return `${TMDB_IMAGE_BASE_URL}/${PROFILE_SIZES[size]}${path}`;
}

// ==========================================================================
// Content Type Detection
// ==========================================================================

/**
 * Determine the content type (movie, tv, animation, anime) from TMDB data
 */
export function getContentType(item: Content): ContentType {
  const isTV = item.media_type === 'tv' || 'first_air_date' in item;
  const genreIds = item.genre_ids ?? item.genres?.map((g) => g.id) ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const originCountry = item.origin_country ?? [];
  const isJapanese = originCountry.includes('JP') || item.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  if (isTV) return 'tv';
  return 'movie';
}

/**
 * Check if content is a movie
 */
export function isMovie(content: Content): content is Movie {
  return content.media_type === 'movie' || 'release_date' in content;
}

/**
 * Check if content is a TV show
 */
export function isTVShow(content: Content): content is TVShow {
  return content.media_type === 'tv' || 'first_air_date' in content;
}

/**
 * Get the title of content (handles both movies and TV shows)
 */
export function getContentTitle(content: Content): string {
  if (isMovie(content)) {
    return content.title;
  }
  return content.name;
}

/**
 * Get the release date of content (handles both movies and TV shows)
 */
export function getContentReleaseDate(content: Content): string | undefined {
  if (isMovie(content)) {
    return content.release_date;
  }
  return content.first_air_date;
}

// ==========================================================================
// URL Helpers
// ==========================================================================

/**
 * Create a URL-friendly slug from a title and year
 */
export function createSlug(title: string, year?: number | string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();

  if (year) {
    return `${baseSlug}-${year}`;
  }
  return baseSlug;
}

/**
 * Extract year from a date string
 */
export function extractYear(dateString: string | undefined): number | undefined {
  if (!dateString) return undefined;
  const year = new Date(dateString).getFullYear();
  return isNaN(year) ? undefined : year;
}

// ==========================================================================
// Formatting Helpers
// ==========================================================================

/**
 * Format runtime in minutes to human-readable string
 */
export function formatRuntime(minutes: number | undefined): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format a date string to a human-readable format
 */
export function formatDate(
  dateString: string | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', options);
  } catch {
    return '';
  }
}

/**
 * Format a number with compact notation (1.5K, 2.3M, etc.)
 */
export function formatCompactNumber(num: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(num);
}

/**
 * Format rating to one decimal place
 */
export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==========================================================================
// Date Helpers
// ==========================================================================

/**
 * Check if a date is within the last N days
 */
export function isWithinDays(dateString: string | undefined, days: number): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

/**
 * Check if a date is within the last N hours
 */
export function isWithinHours(dateString: string | undefined, hours: number): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffHours = diffTime / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= hours;
}

/**
 * Get relative time string (e.g., "3 days ago", "in 2 weeks")
 */
export function formatRelativeTime(dateString: string | undefined): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffDays) < 30) {
    return rtf.format(Math.round(diffDays / 7), 'week');
  }
  if (Math.abs(diffDays) < 365) {
    return rtf.format(Math.round(diffDays / 30), 'month');
  }
  return rtf.format(Math.round(diffDays / 365), 'year');
}

// ==========================================================================
// CSS Class Helpers
// ==========================================================================

/**
 * Conditionally join class names (simple cn utility)
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ==========================================================================
// Misc Helpers
// ==========================================================================

/**
 * Debounce a function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random item from an array
 */
export function randomItem<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}
