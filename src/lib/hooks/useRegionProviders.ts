'use client';

import { useEffect, useState } from 'react';
import { usePreferences } from '@/stores/preferences';

// One request per region per page load, shared by every component asking
const cache = new Map<string, Promise<number[] | null>>();

function loadRegion(region: string): Promise<number[] | null> {
  let pending = cache.get(region);
  if (!pending) {
    pending = fetch(`/api/providers?region=${region}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ids?: number[] } | null) => (Array.isArray(data?.ids) ? data.ids : null))
      .catch(() => null);
    // A failed lookup may be retried on the next mount
    pending.then((ids) => {
      if (ids === null) cache.delete(region);
    });
    cache.set(region, pending);
  }
  return pending;
}

/** The viewer's streaming country (the one title pages show providers for). */
export function useWatchRegion(): string {
  return usePreferences((state) => state.country) || 'US';
}

/**
 * IDs (from STREAMING_PROVIDERS) of the services offered in the viewer's
 * country, or null while unknown — callers then show every service rather
 * than hide them on a failed lookup.
 */
export function useRegionProviders(): { region: string; ids: ReadonlySet<number> | null } {
  const region = useWatchRegion();
  const [loaded, setLoaded] = useState<{ region: string; ids: ReadonlySet<number> } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRegion(region).then((ids) => {
      if (!cancelled && ids) setLoaded({ region, ids: new Set(ids) });
    });
    return () => {
      cancelled = true;
    };
  }, [region]);

  return { region, ids: loaded?.region === region ? loaded.ids : null };
}
