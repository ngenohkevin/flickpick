// ==========================================================================
// Filter state <-> URL
// The URL is the single source of truth for browse filters: pages derive
// their filters from useSearchParams, so links, Back/Forward and shared URLs
// all show the right results. Values are sanitised on the way in.
// ==========================================================================

import type { FilterState } from './FilterSidebar';

type ParamsLike = { get(name: string): string | null };

interface FilterParamOptions {
  /** Query param holding the minimum rating ("rating_min" on browse pages, "rating" on new-release pages) */
  ratingParam?: string;
}

const RUNTIMES = ['short', 'medium', 'long'] as const;

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => id > 0);
  return [...new Set(ids)];
}

function parseYear(raw: string | null): number | null {
  return raw && /^\d{4}$/.test(raw) ? Number(raw) : null;
}

export function parseFilters(params: ParamsLike, { ratingParam = 'rating_min' }: FilterParamOptions = {}): FilterState {
  const rating = Number.parseFloat(params.get(ratingParam) ?? '');
  const runtime = params.get('runtime');
  const language = params.get('language');
  const provider = params.get('provider');

  return {
    genres: parseIds(params.get('genre')),
    excludedGenres: parseIds(params.get('exclude_genre')),
    yearFrom: parseYear(params.get('year_from')),
    yearTo: parseYear(params.get('year_to')),
    ratingMin: rating > 0 && rating <= 10 ? rating : null,
    language: language && /^[a-z]{2}$/.test(language) ? language : null,
    provider: provider && /^\d+$/.test(provider) ? provider : null,
    runtime: (RUNTIMES as readonly string[]).includes(runtime ?? '') ? (runtime as FilterState['runtime']) : null,
  };
}

export function writeFilters(
  params: URLSearchParams,
  filters: FilterState,
  { ratingParam = 'rating_min' }: FilterParamOptions = {}
): URLSearchParams {
  if (filters.genres.length > 0) params.set('genre', filters.genres.join(','));
  if (filters.excludedGenres.length > 0) params.set('exclude_genre', filters.excludedGenres.join(','));
  if (filters.yearFrom) params.set('year_from', String(filters.yearFrom));
  if (filters.yearTo) params.set('year_to', String(filters.yearTo));
  if (filters.ratingMin) params.set(ratingParam, String(filters.ratingMin));
  if (filters.language) params.set('language', filters.language);
  if (filters.provider) params.set('provider', filters.provider);
  if (filters.runtime) params.set('runtime', filters.runtime);
  return params;
}

export function countActiveFilters(filters: FilterState): number {
  return (
    filters.genres.length +
    filters.excludedGenres.length +
    (filters.yearFrom || filters.yearTo ? 1 : 0) +
    (filters.ratingMin ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.provider ? 1 : 0) +
    (filters.runtime ? 1 : 0)
  );
}

/**
 * Pushes a new URL for the current page without a server round trip.
 * Next.js syncs native pushState with useSearchParams, so the page re-derives
 * its filters immediately (router.push re-rendered the route on the server
 * first, so a click took a few hundred ms to register).
 */
export function pushUrl(pathname: string, params: URLSearchParams): void {
  const query = params.toString();
  window.history.pushState(null, '', query ? `${pathname}?${query}` : pathname);
}
