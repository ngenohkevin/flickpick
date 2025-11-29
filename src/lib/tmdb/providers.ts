// ==========================================================================
// TMDB Streaming Providers Functions
// Functions for fetching streaming provider information
// ==========================================================================

import { tmdbFetch, getLogoUrl } from './client';
import type { Provider, WatchProviders, ProvidersByCountry } from '@/types';
import { DEFAULT_COUNTRY } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

interface WatchProvidersResponse {
  id: number;
  results: ProvidersByCountry;
}

interface AvailableProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priorities: Record<string, number>;
}

interface AvailableProvidersResponse {
  results: AvailableProvider[];
}

interface WatchRegion {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

interface WatchRegionsResponse {
  results: WatchRegion[];
}

// ==========================================================================
// Popular Streaming Providers (IDs)
// ==========================================================================

export const POPULAR_PROVIDERS = {
  NETFLIX: 8,
  AMAZON_PRIME: 9,
  DISNEY_PLUS: 337,
  HBO_MAX: 384,
  HULU: 15,
  APPLE_TV_PLUS: 350,
  PARAMOUNT_PLUS: 531,
  PEACOCK: 386,
  CRUNCHYROLL: 283,
  FUNIMATION: 269,
} as const;

// ==========================================================================
// Get Watch Providers
// ==========================================================================

/**
 * Get streaming providers for a movie
 */
export async function getMovieProviders(
  movieId: number
): Promise<WatchProvidersResponse> {
  return tmdbFetch<WatchProvidersResponse>(`/movie/${movieId}/watch/providers`);
}

/**
 * Get streaming providers for a TV show
 */
export async function getTVProviders(showId: number): Promise<WatchProvidersResponse> {
  return tmdbFetch<WatchProvidersResponse>(`/tv/${showId}/watch/providers`);
}

/**
 * Get providers for a specific country
 */
export async function getProvidersForCountry(
  mediaType: 'movie' | 'tv',
  mediaId: number,
  country: string = DEFAULT_COUNTRY
): Promise<WatchProviders | null> {
  const response =
    mediaType === 'movie'
      ? await getMovieProviders(mediaId)
      : await getTVProviders(mediaId);

  return response.results[country] ?? null;
}

// ==========================================================================
// Available Providers List
// ==========================================================================

/**
 * Get list of all available movie streaming providers
 */
export async function getAvailableMovieProviders(
  region?: string
): Promise<AvailableProvider[]> {
  const response = await tmdbFetch<AvailableProvidersResponse>(
    '/watch/providers/movie',
    region ? { watch_region: region } : {}
  );
  return response.results;
}

/**
 * Get list of all available TV streaming providers
 */
export async function getAvailableTVProviders(
  region?: string
): Promise<AvailableProvider[]> {
  const response = await tmdbFetch<AvailableProvidersResponse>('/watch/providers/tv',
    region ? { watch_region: region } : {}
  );
  return response.results;
}

/**
 * Get list of available regions for streaming data
 */
export async function getWatchRegions(): Promise<WatchRegion[]> {
  const response = await tmdbFetch<WatchRegionsResponse>('/watch/providers/regions');
  return response.results;
}

// ==========================================================================
// Provider Helpers
// ==========================================================================

/**
 * Format provider with logo URL
 */
export function formatProvider(provider: Provider): Provider & { logo_url: string | null } {
  return {
    ...provider,
    logo_url: getLogoUrl(provider.logo_path, 'w92'),
  };
}

/**
 * Get the primary streaming provider (first in flatrate list)
 */
export function getPrimaryStreamingProvider(
  providers: WatchProviders
): Provider | null {
  return providers.flatrate?.[0] ?? null;
}

/**
 * Check if content is available on a specific provider
 */
export function isAvailableOnProvider(
  providers: WatchProviders,
  providerId: number
): boolean {
  const allProviders = [
    ...(providers.flatrate ?? []),
    ...(providers.ads ?? []),
    ...(providers.rent ?? []),
    ...(providers.buy ?? []),
  ];

  return allProviders.some((p) => p.provider_id === providerId);
}

/**
 * Get streaming-only providers (excludes rent/buy)
 */
export function getStreamingProviders(providers: WatchProviders): Provider[] {
  return [...(providers.flatrate ?? []), ...(providers.ads ?? [])];
}

/**
 * Get all unique providers (deduplicated)
 */
export function getAllProviders(providers: WatchProviders): Provider[] {
  const all = [
    ...(providers.flatrate ?? []),
    ...(providers.ads ?? []),
    ...(providers.rent ?? []),
    ...(providers.buy ?? []),
  ];

  // Deduplicate by provider_id
  const uniqueMap = new Map<number, Provider>();
  all.forEach((p) => {
    if (!uniqueMap.has(p.provider_id)) {
      uniqueMap.set(p.provider_id, p);
    }
  });

  return Array.from(uniqueMap.values());
}

/**
 * Sort providers by popularity/priority
 */
export function sortProvidersByPriority(providers: Provider[]): Provider[] {
  return [...providers].sort((a, b) => a.display_priority - b.display_priority);
}

/**
 * Filter providers to only include popular streaming services
 */
export function filterPopularProviders(providers: Provider[]): Provider[] {
  const popularIds = Object.values(POPULAR_PROVIDERS) as number[];
  return providers.filter((p) => popularIds.includes(p.provider_id));
}

// ==========================================================================
// Provider Display Names (Overrides)
// ==========================================================================

const PROVIDER_SHORT_NAMES: Record<number, string> = {
  8: 'Netflix',
  9: 'Prime',
  337: 'Disney+',
  384: 'Max',
  15: 'Hulu',
  350: 'Apple TV+',
  531: 'Paramount+',
  386: 'Peacock',
  283: 'Crunchyroll',
  269: 'Funimation',
};

/**
 * Get short display name for a provider
 */
export function getProviderShortName(provider: Provider): string {
  return PROVIDER_SHORT_NAMES[provider.provider_id] ?? provider.provider_name;
}
