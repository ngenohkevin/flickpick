import { describe, it, expect } from 'vitest';
import { findStreamingProvider, providerTmdbIds } from '@/lib/constants';
import { serviceRegions, servicesFromTmdbIds, streamsOnAny } from '@/lib/streaming';
import { parseFilters } from '@/components/browse/filter-params';

describe('streaming providers', () => {
  it('queries every tier of a service', () => {
    expect(providerTmdbIds(2303)).toEqual([2303, 2616]); // Paramount+ Premium | Essential
    expect(providerTmdbIds('386')).toEqual([386, 387]); // Peacock Premium | Premium Plus
    expect(providerTmdbIds(8)).toEqual([8]);
  });

  it('maps retired IDs from old links to the current service', () => {
    expect(providerTmdbIds(531)).toEqual([2303, 2616]); // old Paramount+ (4 titles left on TMDB)
    expect(findStreamingProvider(384)?.name).toBe('HBO Max');
  });

  it('does not offer the Apple TV store (rent/buy matches nearly every film)', () => {
    expect(findStreamingProvider(2)).toBeUndefined();
  });

  it('URL filters keep known services, upgrade retired IDs and drop unknown ones', () => {
    expect(parseFilters(new URLSearchParams('provider=531')).provider).toBe('2303');
    expect(parseFilters(new URLSearchParams('provider=8')).provider).toBe('8');
    expect(parseFilters(new URLSearchParams('provider=2')).provider).toBeNull();
  });
});

describe('streaming availability per country', () => {
  it('collects our services per supported country from a watch/providers result', () => {
    const regions = serviceRegions({
      US: { flatrate: [{ provider_id: 2616 }, { provider_id: 8 }, { provider_id: 999 }] },
      KE: { flatrate: [{ provider_id: 8 }] },
      GB: { ads: [{ provider_id: 387 }] },
      DE: {}, // rent/buy only
      XX: { flatrate: [{ provider_id: 8 }] }, // not a supported country
    });
    expect(regions).toEqual({ US: [2303, 8], KE: [8], GB: [386] });
  });

  it('filters on the viewer’s country, not the US', () => {
    const result = { providerRegions: { US: [8, 15], KE: [8] } };
    expect(streamsOnAny(result, [15], 'US')).toBe(true);
    expect(streamsOnAny(result, [15], 'KE')).toBe(false); // Hulu isn't in Kenya
    expect(streamsOnAny(result, [8], 'KE')).toBe(true);
    expect(streamsOnAny(result, [8], 'GB')).toBe(false);
  });

  it('reads results cached before per-country data existed (US only)', () => {
    const legacy = { providers: [2616, 9] };
    expect(servicesFromTmdbIds(legacy.providers)).toEqual([2303, 9]);
    expect(streamsOnAny(legacy, [2303], 'US')).toBe(true);
    expect(streamsOnAny(legacy, [2303], 'GB')).toBe(false);
  });
});
