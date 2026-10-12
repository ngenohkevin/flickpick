// ==========================================================================
// Streaming availability helpers (shared by server and client)
// ==========================================================================

import { STREAMING_PROVIDERS, SUPPORTED_COUNTRIES } from '@/lib/constants';

type ProviderEntry = { provider_id: number };
type RegionProviders = { flatrate?: ProviderEntry[]; ads?: ProviderEntry[] };

/** TMDB provider ID (any tier) → our service ID */
const SERVICE_BY_TMDB_ID = new Map<number, number>(
  STREAMING_PROVIDERS.flatMap((p) => (p.tmdbIds ?? [p.id]).map((tmdbId) => [tmdbId, p.id] as [number, number]))
);
const SUPPORTED_REGIONS = new Set(SUPPORTED_COUNTRIES.map((c) => c.code));

/** Our services among a list of raw TMDB provider IDs. */
export function servicesFromTmdbIds(tmdbIds: readonly number[]): number[] {
  const services = new Set<number>();
  for (const id of tmdbIds) {
    const service = SERVICE_BY_TMDB_ID.get(id);
    if (service !== undefined) services.add(service);
  }
  return [...services];
}

/**
 * For a title's /watch/providers result: the services streaming it
 * (subscription or with ads) in each supported country. Countries with none
 * are left out.
 */
export function serviceRegions(results: Record<string, RegionProviders | undefined>): Record<string, number[]> {
  const regions: Record<string, number[]> = {};
  for (const [region, providers] of Object.entries(results)) {
    if (!providers || !SUPPORTED_REGIONS.has(region)) continue;
    const services = servicesFromTmdbIds(
      [...(providers.flatrate ?? []), ...(providers.ads ?? [])].map((p) => p.provider_id)
    );
    if (services.length > 0) regions[region] = services;
  }
  return regions;
}

interface WithAvailability {
  /** Raw US TMDB provider IDs (results cached before providerRegions existed) */
  providers?: number[];
  /** Our service IDs per country */
  providerRegions?: Record<string, number[]>;
}

/** Whether a result streams on any of the selected services in a country. */
export function streamsOnAny(result: WithAvailability, selected: readonly number[], region: string): boolean {
  let services: number[];
  if (result.providerRegions) services = result.providerRegions[region] ?? [];
  else if (region === 'US' && result.providers) services = servicesFromTmdbIds(result.providers);
  else return false; // unknown for this country
  return services.some((id) => selected.includes(id));
}
