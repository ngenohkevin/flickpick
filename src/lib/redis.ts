// ==========================================================================
// Redis Cache Helper
// Caching and rate limiting utilities
// ==========================================================================

import Redis from 'ioredis';
import { CACHE_TTL, RATE_LIMITS } from './constants';

// ==========================================================================
// Redis Client
// ==========================================================================

const REDIS_URL = process.env.REDIS_URL;

// Create Redis client (singleton)
let redis: Redis | null = null;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured
 */
export function getRedisClient(): Redis | null {
  if (!REDIS_URL) {
    return null;
  }

  if (!redis) {
    redis = new Redis(REDIS_URL, {
      // The cache is optional, so fail fast while Redis is down: queued
      // commands waited on reconnects and stalled each request by seconds.
      // A command that can't run now errors, and callers treat it as a miss.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      commandTimeout: 1000,
      connectTimeout: 3000,
      retryStrategy: (times) => Math.min(times * 200, 5000),
    });

    // Reconnect attempts fail every few seconds during an outage; log the
    // first and then at most once a minute
    let lastErrorLog = 0;
    redis.on('error', (error) => {
      if (Date.now() - lastErrorLog < 60_000) return;
      lastErrorLog = Date.now();
      console.error('Redis connection error:', error.message);
    });

    redis.on('connect', () => {
      lastErrorLog = 0;
      console.log('Redis connected');
    });
  }

  return redis;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!REDIS_URL && redis?.status === 'ready';
}

// ==========================================================================
// Cache Functions
// ==========================================================================

/**
 * Get cached data or fetch and cache it
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL.MOVIE_DETAILS
): Promise<T> {
  const client = getRedisClient();

  // If no Redis, just fetch
  if (!client) {
    return fetcher();
  }

  // Read from cache; a Redis failure here just means a miss.
  try {
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }

  // Fetch once. Errors propagate: retrying the whole fetcher on any error
  // ran failing TMDB/AI calls twice.
  const data = await fetcher();

  try {
    await client.setex(key, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache write error:', error);
  }

  return data;
}

/**
 * Set a value in cache
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number = CACHE_TTL.MOVIE_DETAILS
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Get a value from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  try {
    const cached = await client.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Delete a value from cache
 */
export async function deleteCache(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete all keys matching a pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

// ==========================================================================
// Cache Key Builders
// ==========================================================================

export const cacheKeys = {
  movie: (id: number) => `movie:${id}`,
  movieCredits: (id: number) => `movie:${id}:credits`,
  movieVideos: (id: number) => `movie:${id}:videos`,
  movieProviders: (id: number) => `movie:${id}:providers`,
  movieSimilar: (id: number) => `movie:${id}:similar`,
  movieImdbId: (id: number) => `movie:${id}:imdb`,

  tv: (id: number) => `tv:${id}`,
  tvCredits: (id: number) => `tv:${id}:credits`,
  tvVideos: (id: number) => `tv:${id}:videos`,
  tvProviders: (id: number) => `tv:${id}:providers`,
  tvSimilar: (id: number) => `tv:${id}:similar`,
  tvSeason: (showId: number, season: number) => `tv:${showId}:season:${season}`,
  tvImdbId: (id: number) => `tv:${id}:imdb`,

  // Torrentio availability
  torrentioMovie: (imdbId: string) => `torrentio:movie:${imdbId}`,
  torrentioTV: (imdbId: string, season: number, episode: number) =>
    `torrentio:tv:${imdbId}:${season}:${episode}`,
  justReleasedMovies: () => `just-released:movies`,

  search: (query: string, page: number) => `search:${query}:${page}`,
  trending: (type: string, window: string, page: number) =>
    `trending:${type}:${window}:${page}`,
  discover: (type: string, params: string, page: number) =>
    `discover:${type}:${params}:${page}`,
  genre: (type: string, id: number, page: number) =>
    `genre:${type}:${id}:${page}`,

  rateLimit: (identifier: string, endpoint: string) =>
    `ratelimit:${endpoint}:${identifier}`,
};

// ==========================================================================
// Rate Limiting
// ==========================================================================

interface RateLimitConfig {
  requests: number;
  window: number; // seconds
}

/**
 * Check if request is rate limited
 * Returns true if the request should be blocked
 */
export async function isRateLimited(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): Promise<boolean> {
  const client = getRedisClient();

  // No rate limiting without Redis
  if (!client) return false;

  const key = cacheKeys.rateLimit(identifier, endpoint);

  try {
    // Create the window with its expiry first (NX: only if absent), then
    // count. INCR keeps the TTL, so a failure can't leave a key that never
    // expires and blocks the visitor for good.
    await client.set(key, 0, 'EX', config.window, 'NX');
    const current = await client.incr(key);

    return current > config.requests;
  } catch (error) {
    console.error('Rate limit check error:', error);
    return false; // Allow on error
  }
}

/**
 * Get remaining requests for rate limit
 */
export async function getRateLimitRemaining(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = RATE_LIMITS.DEFAULT
): Promise<number> {
  const client = getRedisClient();
  if (!client) return config.requests;

  const key = cacheKeys.rateLimit(identifier, endpoint);

  try {
    const current = await client.get(key);
    const used = current ? parseInt(current, 10) : 0;
    return Math.max(0, config.requests - used);
  } catch {
    return config.requests;
  }
}

// ==========================================================================
// AI Provider Rate Limit Tracking
// ==========================================================================

/**
 * Mark AI provider as rate limited
 */
export async function markAIProviderLimited(
  provider: string,
  ttlSeconds: number = 60
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    await client.setex(`ai:ratelimit:${provider}`, ttlSeconds, '1');
  } catch (error) {
    console.error('AI rate limit mark error:', error);
  }
}

/**
 * Check if AI provider is rate limited
 */
export async function isAIProviderLimited(provider: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const limited = await client.get(`ai:ratelimit:${provider}`);
    return limited === '1';
  } catch {
    return false;
  }
}

// ==========================================================================
// Prompt Caching (for AI Discovery)
// ==========================================================================

/**
 * Normalize a prompt for consistent cache key generation
 * - Lowercase
 * - Trim whitespace
 * - Remove extra spaces
 * - Remove common filler words for better matching
 */
export function normalizePrompt(prompt: string): string {
  return prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .replace(/[^\p{L}\p{N}\s]/gu, '') // Remove punctuation; keep letters in any script
    .split(' ')
    .filter((word) => !['a', 'an', 'the', 'i', 'me', 'my', 'want', 'to', 'watch', 'see', 'find', 'show', 'give'].includes(word))
    .join(' ')
    .trim();
}

/**
 * Generate cache key for a prompt
 */
export function getPromptCacheKey(prompt: string, contentTypes?: readonly string[]): string {
  const normalized = normalizePrompt(prompt);
  const types = contentTypes && contentTypes.length > 0 ? [...contentTypes].sort().join(',') : 'all';
  return `discover:prompt:${types}:${normalized}`;
}

/**
 * Get prompt popularity key
 */
function getPromptPopularityKey(normalizedPrompt: string): string {
  return `discover:popularity:${normalizedPrompt}`;
}

/**
 * Threshold for caching a prompt (number of times it needs to be searched)
 */
const PROMPT_CACHE_THRESHOLD = 3;

/**
 * TTL for cached prompts (12 hours - shorter than moods since prompts are more dynamic)
 */
const PROMPT_CACHE_TTL = 43200;

/**
 * TTL for popularity tracking (24 hours rolling window)
 */
const POPULARITY_TTL = 86400;

/**
 * Track prompt search and check if it should be cached
 * Returns true if the prompt has reached the caching threshold
 */
export async function trackPromptPopularity(prompt: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  const normalized = normalizePrompt(prompt);
  const key = getPromptPopularityKey(normalized);

  try {
    const count = await client.incr(key);

    // Set TTL on first increment
    if (count === 1) {
      await client.expire(key, POPULARITY_TTL);
    }

    return count >= PROMPT_CACHE_THRESHOLD;
  } catch (error) {
    console.error('Prompt popularity tracking error:', error);
    return false;
  }
}

/**
 * Check if a prompt is popular enough to be cached
 */
export async function isPromptPopular(prompt: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  const normalized = normalizePrompt(prompt);
  const key = getPromptPopularityKey(normalized);

  try {
    const count = await client.get(key);
    return count ? parseInt(count, 10) >= PROMPT_CACHE_THRESHOLD : false;
  } catch {
    return false;
  }
}

/**
 * Get cached prompt results
 */
export async function getCachedPromptResults<T>(
  prompt: string,
  contentTypes?: readonly string[]
): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;

  const key = getPromptCacheKey(prompt, contentTypes);

  try {
    const cached = await client.get(key);
    return cached ? (JSON.parse(cached) as T) : null;
  } catch (error) {
    console.error('Prompt cache get error:', error);
    return null;
  }
}

/**
 * Cache prompt results
 */
export async function cachePromptResults<T>(
  prompt: string,
  results: T,
  ttl: number = PROMPT_CACHE_TTL,
  contentTypes?: readonly string[]
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  const key = getPromptCacheKey(prompt, contentTypes);

  try {
    await client.setex(key, ttl, JSON.stringify(results));
    console.log(`[Cache] Cached prompt: "${normalizePrompt(prompt)}"`);
  } catch (error) {
    console.error('Prompt cache set error:', error);
  }
}

/**
 * Pre-cache example prompts on startup or first request
 * Call this with the results after generating them
 */
export async function preCacheExamplePrompt<T>(
  prompt: string,
  results: T
): Promise<void> {
  // Use longer TTL for example prompts (24 hours)
  await cachePromptResults(prompt, results, CACHE_TTL.SIMILAR);
}

// ==========================================================================
// Cleanup
// ==========================================================================

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
