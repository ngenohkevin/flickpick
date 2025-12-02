// ==========================================================================
// Stream Providers
// Multiple Stremio addon providers with fallback support
// ==========================================================================

import type { TorrentioResponse, TorrentioStream } from './types';

// ==========================================================================
// Provider Interface
// ==========================================================================

export interface StreamProvider {
  name: string;
  baseUrl: string;
  priority: number; // Lower = higher priority
  isAvailable: () => Promise<boolean>;
  getMovieStreams: (imdbId: string) => Promise<TorrentioResponse>;
  getTVStreams: (imdbId: string, season: number, episode: number) => Promise<TorrentioResponse>;
}

// ==========================================================================
// Provider Configuration
// ==========================================================================

const REQUEST_TIMEOUT = 8000; // 8 seconds per provider

// Track provider health (in-memory, resets on cold start)
const providerHealth: Map<string, { failures: number; lastCheck: number }> = new Map();

const HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_FAILURES_BEFORE_SKIP = 3;

/**
 * Check if a provider should be skipped due to recent failures
 */
function shouldSkipProvider(providerName: string): boolean {
  const health = providerHealth.get(providerName);
  if (!health) return false;

  // Reset after health check interval
  if (Date.now() - health.lastCheck > HEALTH_CHECK_INTERVAL) {
    providerHealth.delete(providerName);
    return false;
  }

  return health.failures >= MAX_FAILURES_BEFORE_SKIP;
}

/**
 * Record a provider failure
 */
function recordFailure(providerName: string): void {
  const health = providerHealth.get(providerName) || { failures: 0, lastCheck: Date.now() };
  health.failures++;
  health.lastCheck = Date.now();
  providerHealth.set(providerName, health);
}

/**
 * Record a provider success (reset failures)
 */
function recordSuccess(providerName: string): void {
  providerHealth.delete(providerName);
}

// ==========================================================================
// Fetch Helper
// ==========================================================================

async function fetchWithTimeout(
  url: string,
  timeout: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'FlickPick/1.0',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ==========================================================================
// Provider Implementations
// ==========================================================================

/**
 * Torrentio - Primary provider (most popular, comprehensive)
 * https://torrentio.strem.fun
 */
export const TorrentioProvider: StreamProvider = {
  name: 'torrentio',
  baseUrl: 'https://torrentio.strem.fun',
  priority: 1,

  isAvailable: async () => {
    try {
      const response = await fetchWithTimeout(
        'https://torrentio.strem.fun/manifest.json',
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getMovieStreams: async (imdbId: string) => {
    const response = await fetchWithTimeout(
      `https://torrentio.strem.fun/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`Torrentio error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://torrentio.strem.fun/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`Torrentio error: ${response.status}`);
    return response.json();
  },
};

/**
 * Comet - Fast alternative with debrid support
 * https://comet.elfhosted.com
 */
export const CometProvider: StreamProvider = {
  name: 'comet',
  baseUrl: 'https://comet.elfhosted.com',
  priority: 2,

  isAvailable: async () => {
    try {
      const response = await fetchWithTimeout(
        'https://comet.elfhosted.com/manifest.json',
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getMovieStreams: async (imdbId: string) => {
    // Comet requires configuration, use public instance with defaults
    const response = await fetchWithTimeout(
      `https://comet.elfhosted.com/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`Comet error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://comet.elfhosted.com/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`Comet error: ${response.status}`);
    return response.json();
  },
};

/**
 * MediaFusion - Universal addon with extensive catalogs
 * https://mediafusion.elfhosted.com
 */
export const MediaFusionProvider: StreamProvider = {
  name: 'mediafusion',
  baseUrl: 'https://mediafusion.elfhosted.com',
  priority: 3,

  isAvailable: async () => {
    try {
      const response = await fetchWithTimeout(
        'https://mediafusion.elfhosted.com/manifest.json',
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getMovieStreams: async (imdbId: string) => {
    // MediaFusion uses 'playback' endpoint
    const response = await fetchWithTimeout(
      `https://mediafusion.elfhosted.com/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`MediaFusion error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://mediafusion.elfhosted.com/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`MediaFusion error: ${response.status}`);
    return response.json();
  },
};

/**
 * TorrentsDB - Fork of Torrentio with more providers
 * https://torrentsdb.com
 */
export const TorrentsDBProvider: StreamProvider = {
  name: 'torrentsdb',
  baseUrl: 'https://torrentsdb.com',
  priority: 4,

  isAvailable: async () => {
    try {
      const response = await fetchWithTimeout(
        'https://torrentsdb.com/manifest.json',
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getMovieStreams: async (imdbId: string) => {
    const response = await fetchWithTimeout(
      `https://torrentsdb.com/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`TorrentsDB error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://torrentsdb.com/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`TorrentsDB error: ${response.status}`);
    return response.json();
  },
};

/**
 * Knightcrawler - Another Torrentio alternative
 * Public instance
 */
export const KnightcrawlerProvider: StreamProvider = {
  name: 'knightcrawler',
  baseUrl: 'https://knightcrawler.elfhosted.com',
  priority: 5,

  isAvailable: async () => {
    try {
      const response = await fetchWithTimeout(
        'https://knightcrawler.elfhosted.com/manifest.json',
        5000
      );
      return response.ok;
    } catch {
      return false;
    }
  },

  getMovieStreams: async (imdbId: string) => {
    const response = await fetchWithTimeout(
      `https://knightcrawler.elfhosted.com/stream/movie/${imdbId}.json`
    );
    if (!response.ok) throw new Error(`Knightcrawler error: ${response.status}`);
    return response.json();
  },

  getTVStreams: async (imdbId: string, season: number, episode: number) => {
    const response = await fetchWithTimeout(
      `https://knightcrawler.elfhosted.com/stream/series/${imdbId}:${season}:${episode}.json`
    );
    if (!response.ok) throw new Error(`Knightcrawler error: ${response.status}`);
    return response.json();
  },
};

// ==========================================================================
// Provider Chain
// ==========================================================================

/**
 * All available providers, sorted by priority
 */
export const ALL_PROVIDERS: StreamProvider[] = [
  TorrentioProvider,
  CometProvider,
  MediaFusionProvider,
  TorrentsDBProvider,
  KnightcrawlerProvider,
].sort((a, b) => a.priority - b.priority);

/**
 * Get movie streams with automatic fallback
 * Tries providers in order until one succeeds
 */
export async function getMovieStreamsWithFallback(
  imdbId: string
): Promise<{ streams: TorrentioStream[]; provider: string }> {
  const errors: string[] = [];

  for (const provider of ALL_PROVIDERS) {
    // Skip providers with recent failures
    if (shouldSkipProvider(provider.name)) {
      continue;
    }

    try {
      const response = await provider.getMovieStreams(imdbId);

      if (response.streams && response.streams.length > 0) {
        recordSuccess(provider.name);
        return {
          streams: response.streams,
          provider: provider.name,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${provider.name}: ${errorMsg}`);
      recordFailure(provider.name);
    }
  }

  // All providers failed
  console.error(`All providers failed for movie ${imdbId}:`, errors);
  return { streams: [], provider: 'none' };
}

/**
 * Get TV streams with automatic fallback
 */
export async function getTVStreamsWithFallback(
  imdbId: string,
  season: number,
  episode: number
): Promise<{ streams: TorrentioStream[]; provider: string }> {
  const errors: string[] = [];

  for (const provider of ALL_PROVIDERS) {
    if (shouldSkipProvider(provider.name)) {
      continue;
    }

    try {
      const response = await provider.getTVStreams(imdbId, season, episode);

      if (response.streams && response.streams.length > 0) {
        recordSuccess(provider.name);
        return {
          streams: response.streams,
          provider: provider.name,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${provider.name}: ${errorMsg}`);
      recordFailure(provider.name);
    }
  }

  console.error(`All providers failed for TV ${imdbId}:${season}:${episode}:`, errors);
  return { streams: [], provider: 'none' };
}

/**
 * Check health of all providers
 */
export async function checkProvidersHealth(): Promise<
  Array<{ name: string; available: boolean }>
> {
  const results = await Promise.all(
    ALL_PROVIDERS.map(async (provider) => ({
      name: provider.name,
      available: await provider.isAvailable(),
    }))
  );

  return results;
}
