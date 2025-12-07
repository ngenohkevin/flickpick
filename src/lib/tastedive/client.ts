// ==========================================================================
// TasteDive API Client
// Functions for fetching similar content recommendations
// ==========================================================================

import { getCache, setCache, getRedisClient } from '@/lib/redis';
import type {
  TasteDiveResponse,
  TasteDiveResult,
  TasteDiveMatch,
  NormalizedType,
} from './types';
import { TASTEDIVE_CONFIG, tasteDiveCacheKeys } from './types';

// ==========================================================================
// Configuration
// ==========================================================================

const TASTEDIVE_API_KEY = process.env.TASTEDIVE_API_KEY;

// ==========================================================================
// Rate Limiting
// ==========================================================================

/**
 * Check if TasteDive API is rate limited
 * Tracks requests per hour (300 req/hr limit)
 */
export async function isTasteDiveRateLimited(): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;

  try {
    const key = tasteDiveCacheKeys.rateLimit();
    const current = await client.get(key);
    const count = current ? parseInt(current, 10) : 0;
    return count >= TASTEDIVE_CONFIG.RATE_LIMIT_REQUESTS;
  } catch {
    return false;
  }
}

/**
 * Increment TasteDive rate limit counter
 */
async function incrementRateLimit(): Promise<void> {
  const client = getRedisClient();
  if (!client) return;

  try {
    const key = tasteDiveCacheKeys.rateLimit();
    const current = await client.incr(key);

    // Set expiry on first request of the window
    if (current === 1) {
      await client.expire(key, TASTEDIVE_CONFIG.RATE_LIMIT_WINDOW);
    }
  } catch (error) {
    console.error('TasteDive rate limit increment error:', error);
  }
}

/**
 * Get remaining TasteDive API requests
 */
export async function getTasteDiveRemainingRequests(): Promise<number> {
  const client = getRedisClient();
  if (!client) return TASTEDIVE_CONFIG.RATE_LIMIT_REQUESTS;

  try {
    const key = tasteDiveCacheKeys.rateLimit();
    const current = await client.get(key);
    const count = current ? parseInt(current, 10) : 0;
    return Math.max(0, TASTEDIVE_CONFIG.RATE_LIMIT_REQUESTS - count);
  } catch {
    return TASTEDIVE_CONFIG.RATE_LIMIT_REQUESTS;
  }
}

// ==========================================================================
// API Functions
// ==========================================================================

/**
 * Normalize TasteDive type to our internal type
 */
function normalizeType(type: string): NormalizedType {
  // TasteDive uses 'show' for TV series
  return type === 'show' ? 'tv' : 'movie';
}

/**
 * Convert TasteDive result to our match format
 * Note: TasteDive API returns lowercase keys
 */
function toMatch(result: TasteDiveResult): TasteDiveMatch {
  return {
    name: result.name,
    type: normalizeType(result.type),
    description: result.wTeaser || result.description || undefined,
    wikipediaUrl: result.wUrl || undefined,
    youtubeUrl: result.yUrl || undefined,
    youtubeId: result.yID || undefined,
  };
}

/**
 * Sanitize title for TasteDive query
 * Removes/replaces characters that conflict with TasteDive's query format
 */
function sanitizeTitle(title: string): string {
  return title
    .replace(/:/g, ' -')  // Replace colons (conflicts with type:title format)
    .replace(/,/g, '')    // Remove commas (used as query separator)
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract base title by removing sequel numbers and common suffixes
 * e.g., "Zootopia 2" -> "Zootopia", "Toy Story 3" -> "Toy Story"
 */
function getBaseTitle(title: string): string | null {
  // Match patterns like "Title 2", "Title II", "Title: Part 2", "Title - Part Two"
  const sequelPatterns = [
    /\s+\d+$/,                          // "Zootopia 2"
    /\s+[IVXLC]+$/i,                    // "Rocky IV"
    /\s*[-:]\s*Part\s+\w+$/i,           // "Harry Potter: Part 2"
    /\s*[-:]\s*Chapter\s+\w+$/i,        // "John Wick: Chapter 4"
    /\s*[-:]\s*Episode\s+\w+$/i,        // "Star Wars: Episode V"
    /\s*[-:]\s*Vol\.?\s*\d+$/i,         // "Guardians: Vol. 3"
    /\s*[-:]\s*Volume\s+\d+$/i,         // "Kill Bill: Volume 2"
  ];

  for (const pattern of sequelPatterns) {
    if (pattern.test(title)) {
      const base = title.replace(pattern, '').trim();
      // Only return if we got a meaningful base title
      if (base.length >= 2) {
        return base;
      }
    }
  }

  return null;
}

/**
 * Calculate title similarity score (0-1)
 * Used to verify TasteDive found the right content
 */
function calculateTitleSimilarity(query: string, found: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const q = normalize(query);
  const f = normalize(found);

  // Exact match
  if (q === f) return 1.0;

  // One contains the other
  if (f.includes(q) || q.includes(f)) {
    return 0.8;
  }

  // Check word overlap
  const qWords = new Set(q.split(' '));
  const fWords = new Set(f.split(' '));
  const intersection = [...qWords].filter((w) => fWords.has(w));
  const union = new Set([...qWords, ...fWords]);

  // Jaccard similarity
  return intersection.length / union.size;
}

/**
 * Validate that TasteDive actually found our requested content
 * Returns true if the primary match (first info item) matches our query
 *
 * Note: Secondary info items are often legitimately related content (e.g.,
 * "Spartacus: House of Ashur" → "House of the Dragon" is a valid thematic match).
 * We only validate the primary match, not secondary items.
 */
function validateTasteDiveResponse(
  queryTitle: string,
  infoItems: Array<{ name: string; type: string }>,
  expectedType: 'movie' | 'show'
): boolean {
  if (!infoItems || infoItems.length === 0) {
    return false;
  }

  const firstMatch = infoItems[0];
  if (!firstMatch) {
    return false;
  }

  // Type should match
  if (firstMatch.type !== expectedType) {
    console.log(`[TasteDive] Type mismatch: expected ${expectedType}, got ${firstMatch.type}`);
    return false;
  }

  // First item should match our query
  const primarySimilarity = calculateTitleSimilarity(queryTitle, firstMatch.name);
  if (primarySimilarity < 0.5) {
    console.log(
      `[TasteDive] Title mismatch: queried "${queryTitle}", got "${firstMatch.name}" (similarity: ${primarySimilarity.toFixed(2)})`
    );
    return false;
  }

  return true;
}

/**
 * Build TasteDive query string from titles
 * @param titles Array of titles to query
 * @param type Type prefix ('movie' or 'show')
 */
function buildQuery(titles: string[], type: 'movie' | 'show' = 'movie'): string {
  return titles.map((t) => `${type}:${sanitizeTitle(t)}`).join(',');
}

/**
 * Fetch from TasteDive API with timeout
 */
async function fetchTasteDive(params: URLSearchParams): Promise<TasteDiveResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TASTEDIVE_CONFIG.REQUEST_TIMEOUT);

  try {
    const url = `${TASTEDIVE_CONFIG.BASE_URL}?${params.toString()}`;

    // Log the query (without API key) for debugging
    const debugParams = new URLSearchParams(params);
    debugParams.delete('k');
    console.log('[TasteDive] Fetching:', `${TASTEDIVE_CONFIG.BASE_URL}?${debugParams.toString()}`);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to get error details from response body
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = errorBody ? ` - ${errorBody.slice(0, 200)}` : '';
      } catch {
        // Ignore error reading body
      }
      throw new Error(`TasteDive API error: ${response.status} ${response.statusText}${errorDetails}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Internal function to fetch and validate TasteDive results
 */
async function fetchAndValidateTasteDive(
  title: string,
  tasteDiveType: 'movie' | 'show',
  limit: number
): Promise<{ results: TasteDiveMatch[]; valid: boolean }> {
  const params = new URLSearchParams({
    q: buildQuery([title], tasteDiveType),
    type: tasteDiveType,
    info: '1',
    limit: String(limit),
    k: TASTEDIVE_API_KEY!,
  });

  const data = await fetchTasteDive(params);

  if (!data.similar?.results || data.similar.results.length === 0) {
    console.log(`[TasteDive] No matches for "${title}"`);
    return { results: [], valid: false };
  }

  // Validate that TasteDive actually found the right content
  const isValidResponse = validateTasteDiveResponse(
    title,
    data.similar.info,
    tasteDiveType
  );

  if (!isValidResponse) {
    console.log(`[TasteDive] Response validation failed for "${title}" - results may be for wrong content`);
    return { results: data.similar.results.map(toMatch), valid: false };
  }

  return { results: data.similar.results.map(toMatch), valid: true };
}

/**
 * Get similar content from TasteDive for a single title
 * @param title The title to find similar content for
 * @param type Content type ('movie' or 'tv')
 * @param limit Maximum number of results
 */
export async function getSimilar(
  title: string,
  type: NormalizedType = 'movie',
  limit: number = TASTEDIVE_CONFIG.DEFAULT_LIMIT
): Promise<TasteDiveMatch[]> {
  if (!TASTEDIVE_API_KEY) {
    console.warn('[TasteDive] API key not configured - skipping TasteDive');
    throw new Error('TASTEDIVE_API_KEY is not configured');
  }

  // Check rate limit
  const isLimited = await isTasteDiveRateLimited();
  if (isLimited) {
    throw new Error('TasteDive API rate limit exceeded');
  }

  const cacheKey = tasteDiveCacheKeys.similar(type, title);
  const tasteDiveType = type === 'tv' ? 'show' : 'movie';

  // Check cache first
  const cached = await getCache<TasteDiveMatch[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  // Track rate limit
  await incrementRateLimit();

  // Try the original title first
  let { results, valid } = await fetchAndValidateTasteDive(title, tasteDiveType, limit);

  // If TasteDive returned results but for the wrong content (common with sequels),
  // try the base title instead
  if (!valid && results.length > 0) {
    const baseTitle = getBaseTitle(title);
    if (baseTitle) {
      console.log(`[TasteDive] Trying base title "${baseTitle}" instead of "${title}"`);
      await incrementRateLimit(); // This uses another API call
      const baseResult = await fetchAndValidateTasteDive(baseTitle, tasteDiveType, limit);

      if (baseResult.valid && baseResult.results.length > 0) {
        console.log(`[TasteDive] Base title "${baseTitle}" returned valid results`);
        results = baseResult.results;
        valid = true;
      }
    }
  }

  // If we still don't have valid results, return empty to trigger TMDB fallback
  if (!valid) {
    console.log(`[TasteDive] No valid matches for "${title}" - falling back to TMDB`);
    return [];
  }

  console.log(`[TasteDive] Found ${results.length} similar items for "${title}"`);

  // Only cache valid, non-empty results
  if (results.length > 0) {
    await setCache(cacheKey, results, TASTEDIVE_CONFIG.CACHE_TTL);
  }

  return results;
}

/**
 * Get blended recommendations from multiple titles
 * TasteDive finds content that combines the essence of all input titles
 * @param titles Array of 2-3 titles to blend
 * @param type Content type ('movie' or 'tv')
 * @param limit Maximum number of results
 */
export async function getBlend(
  titles: string[],
  type: NormalizedType = 'movie',
  limit: number = TASTEDIVE_CONFIG.DEFAULT_LIMIT
): Promise<TasteDiveMatch[]> {
  if (!TASTEDIVE_API_KEY) {
    throw new Error('TASTEDIVE_API_KEY is not configured');
  }

  if (titles.length < 2 || titles.length > 5) {
    throw new Error('Blend requires 2-5 titles');
  }

  // Check rate limit
  const isLimited = await isTasteDiveRateLimited();
  if (isLimited) {
    throw new Error('TasteDive API rate limit exceeded');
  }

  const cacheKey = tasteDiveCacheKeys.blend(titles);
  const tasteDiveType = type === 'tv' ? 'show' : 'movie';

  // Check cache first
  const cached = await getCache<TasteDiveMatch[]>(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  // Track rate limit
  await incrementRateLimit();

  const params = new URLSearchParams({
    q: buildQuery(titles, tasteDiveType),
    type: tasteDiveType,
    info: '1',
    limit: String(limit),
    k: TASTEDIVE_API_KEY,
  });

  const data = await fetchTasteDive(params);

  if (!data.similar?.results || data.similar.results.length === 0) {
    console.log(`[TasteDive] No blend results for "${titles.join(', ')}" - not caching`);
    return [];
  }

  const results = data.similar.results.map(toMatch);
  console.log(`[TasteDive] Found ${results.length} blend results for "${titles.join(', ')}"`);

  // Only cache non-empty results
  if (results.length > 0) {
    await setCache(cacheKey, results, TASTEDIVE_CONFIG.CACHE_TTL);
  }

  return results;
}

/**
 * Check if TasteDive API is available
 * Checks API key and rate limit status
 */
// Track if we've warned about missing API key (to avoid log spam)
let tasteDiveKeyWarned = false;

export async function isTasteDiveAvailable(): Promise<boolean> {
  if (!TASTEDIVE_API_KEY) {
    // Only log once per process to avoid spam
    if (!tasteDiveKeyWarned) {
      console.log('[TasteDive] API key not configured - using TMDB for similar content');
      tasteDiveKeyWarned = true;
    }
    return false;
  }

  const isLimited = await isTasteDiveRateLimited();
  return !isLimited;
}

/**
 * Extract title mentions from a prompt (for AI fallback)
 * Looks for quoted titles or known patterns
 */
export function extractTitleMentions(prompt: string): string[] {
  const titles: string[] = [];

  // Match quoted titles (both single and double quotes)
  const quotedMatches = prompt.match(/["']([^"']+)["']/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const title = match.slice(1, -1).trim();
      if (title.length > 0) {
        titles.push(title);
      }
    }
  }

  // Match "like X" or "similar to X" patterns
  const likePatterns = [
    /(?:like|similar to|reminds? (?:me )?of)\s+([A-Z][^,."']+)/gi,
    /movies?\s+(?:like|such as)\s+([A-Z][^,."']+)/gi,
    /shows?\s+(?:like|such as)\s+([A-Z][^,."']+)/gi,
  ];

  for (const pattern of likePatterns) {
    const matches = prompt.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const title = match[1].trim();
        // Avoid common false positives
        if (title.length > 2 && !['The', 'A', 'An', 'This', 'That'].includes(title)) {
          titles.push(title);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(titles)];
}
