// ==========================================================================
// AI Recommendation System
// Provider orchestration with fallback and TMDB enrichment
// ==========================================================================

import { GeminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { deepseekProvider } from './providers/deepseek';
import { TasteDiveProvider } from './providers/tastedive';
import { TMDBProvider } from './providers/tmdb';
import { searchMovies, searchTVShows } from '@/lib/tmdb/search';
import type { TMDBMovie as TMDBMovieResult } from '@/lib/tmdb/movies';
import type { TMDBTVShow as TMDBTVResult } from '@/lib/tmdb/tv';
import { getMovieProviders, getTVProviders, getStreamingProviders } from '@/lib/tmdb/providers';
import { ANIMATION_GENRE_ID, DEFAULT_COUNTRY } from '@/lib/constants';
import { serviceRegions } from '@/lib/streaming';
import type { AIProvider, AIRecommendation, EnrichedRecommendation } from './types';
import type { ContentType } from '@/types';

// ==========================================================================
// Provider Chain
// ==========================================================================

/**
 * Ordered list of AI providers (fallback chain)
 * When primary fails, try the next one
 *
 * Chain order:
 * 1. Groq - Primary AI (openai/gpt-oss-120b, free tier, very fast)
 * 2. DeepSeek - Secondary (requires balance but cheap)
 * 3. Gemini - Tertiary (gemini-3.6-flash; free tier is 20 req/day)
 * 4. TasteDive - Extracts titles and finds similar content
 * 5. TMDB - Ultimate fallback, uses keyword→genre mapping + discover
 */
const AI_PROVIDERS: AIProvider[] = [
  groqProvider,
  deepseekProvider,
  GeminiProvider,
  TasteDiveProvider,
  TMDBProvider,
];

// ==========================================================================
// Retry Configuration
// ==========================================================================

const RETRY_CONFIG = {
  maxRetries: 2,           // Retry up to 2 times per provider
  initialDelayMs: 500,     // Start with 500ms delay
  maxDelayMs: 3000,        // Max 3 second delay
  backoffMultiplier: 2,    // Double delay each retry
};

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  providerName: string,
  config = RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;
  let delay = config.initialDelayMs;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry errors a retry can't fix: missing config, a retired
      // model, or a rate limit (the next provider is the better bet).
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('not configured') ||
        errorMessage.includes('api key') ||
        errorMessage.includes('insufficient balance') ||
        errorMessage.includes('model_not_found') ||
        errorMessage.includes('model_decommissioned') ||
        errorMessage.includes('error: 429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('timed out')
      ) {
        throw lastError;
      }

      if (attempt < config.maxRetries) {
        console.log(`[${providerName}] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed');
}

// ==========================================================================
// TMDB Enrichment
// ==========================================================================

/**
 * Where a title streams (flatrate/ads only, not rent/buy): raw US provider
 * IDs, plus our services per country so the filter can follow the viewer's
 * country. One TMDB call covers every country.
 */
async function getProviderIds(
  mediaType: 'movie' | 'tv',
  id: number
): Promise<{ providers: number[]; providerRegions: Record<string, number[]> }> {
  try {
    const response = mediaType === 'movie'
      ? await getMovieProviders(id)
      : await getTVProviders(id);

    const countryProviders = response.results[DEFAULT_COUNTRY];
    return {
      providers: countryProviders ? getStreamingProviders(countryProviders).map((p) => p.provider_id) : [],
      providerRegions: serviceRegions(response.results),
    };
  } catch (error) {
    console.warn(`Failed to fetch providers for ${mediaType}/${id}:`, error);
    return { providers: [], providerRegions: {} };
  }
}

/** Lowercase letters and digits only, so punctuation and "&"/"and" don't block a match. */
function normTitle(value: string): string {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^\p{L}\p{N}]/gu, '');
}

function yearOf(date: string | undefined | null): number | null {
  return date ? Number(date.slice(0, 4)) || null : null;
}

export interface MatchCandidate {
  title: string;
  original: string;
  year: number | null;
  votes: number;
}

/**
 * Index of the search result that is really the title the AI meant, or -1.
 * Search results are ranked by popularity, so taking the first hit returned
 * a different film whenever a more popular one shared words with the title.
 * A candidate must match the title (or original-language title); among
 * matches the closest year wins, then the most votes. `tolerance` is the
 * allowed year difference when the AI gave a year.
 */
export function pickBestMatch(
  candidates: MatchCandidate[],
  title: string,
  year: number | undefined,
  tolerance: number
): number {
  const want = normTitle(title);
  const wantBase = normTitle(title.split(':')[0] ?? title);
  if (!want) return -1;

  let best = -1;
  let bestScore = -1;
  candidates.forEach((c, i) => {
    const yearDiff = year && c.year ? Math.abs(c.year - year) : 0;
    if (year && c.year && yearDiff > tolerance) return;

    let titleScore = 0;
    if (normTitle(c.title) === want || normTitle(c.original) === want) {
      titleScore = 2;
    } else if (yearDiff === 0 && (normTitle(c.title.split(':')[0] ?? '') === want || normTitle(c.title) === wantBase)) {
      titleScore = 1; // "Borat" vs "Borat: Cultural Learnings...", same year
    } else {
      return;
    }

    const score = titleScore * 1e9 + (10 - yearDiff) * 1e7 + Math.min(c.votes, 9_999_999);
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  return best;
}

/** Search with the AI's year first, then without it (AI years are often off by one). */
async function searchBestMovie(title: string, year: number | undefined): Promise<TMDBMovieResult | null> {
  const pick = (results: TMDBMovieResult[], tolerance: number) => {
    const i = pickBestMatch(
      results.map((m) => ({ title: m.title, original: m.original_title ?? '', year: yearOf(m.release_date), votes: m.vote_count ?? 0 })),
      title,
      year,
      tolerance
    );
    return i >= 0 ? (results[i] ?? null) : null;
  };
  if (year) {
    const withYear = await searchMovies({ query: title, primary_release_year: year });
    const match = pick(withYear.results ?? [], 0);
    if (match) return match;
  }
  const anyYear = await searchMovies({ query: title });
  return pick(anyYear.results ?? [], 1);
}

async function searchBestTV(title: string, year: number | undefined): Promise<TMDBTVResult | null> {
  const pick = (results: TMDBTVResult[], tolerance: number) => {
    const i = pickBestMatch(
      results.map((s) => ({ title: s.name, original: s.original_name ?? '', year: yearOf(s.first_air_date), votes: s.vote_count ?? 0 })),
      title,
      year,
      tolerance
    );
    return i >= 0 ? (results[i] ?? null) : null;
  };
  if (year) {
    const withYear = await searchTVShows({ query: title, first_air_date_year: year });
    const match = pick(withYear.results ?? [], 0);
    if (match) return match;
  }
  const anyYear = await searchTVShows({ query: title });
  return pick(anyYear.results ?? [], 1);
}

function enrichMovie(match: TMDBMovieResult, reason: string, fallbackYear: number): EnrichedRecommendation {
  const genreIds = match.genre_ids ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = match.original_language === 'ja';
  let contentType: ContentType = 'movie';
  if (isAnimation && isJapanese) {
    contentType = 'anime';
  } else if (isAnimation) {
    contentType = 'animation';
  }
  return {
    id: match.id,
    title: match.title,
    year: yearOf(match.release_date) ?? fallbackYear,
    media_type: 'movie',
    content_type: contentType,
    poster_path: match.poster_path,
    backdrop_path: match.backdrop_path,
    vote_average: match.vote_average,
    vote_count: match.vote_count,
    overview: match.overview ?? '',
    popularity: match.popularity,
    genre_ids: genreIds,
    original_language: match.original_language ?? 'en',
    reason,
  };
}

function enrichTV(match: TMDBTVResult, reason: string, fallbackYear: number): EnrichedRecommendation {
  const genreIds = match.genre_ids ?? [];
  const originCountry = match.origin_country ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = originCountry.includes('JP') || match.original_language === 'ja';
  let contentType: ContentType = 'tv';
  if (isAnimation && isJapanese) {
    contentType = 'anime';
  } else if (isAnimation) {
    contentType = 'animation';
  }
  return {
    id: match.id,
    title: match.name,
    year: yearOf(match.first_air_date) ?? fallbackYear,
    media_type: 'tv',
    content_type: contentType,
    poster_path: match.poster_path,
    backdrop_path: match.backdrop_path,
    vote_average: match.vote_average,
    vote_count: match.vote_count ?? 0,
    overview: match.overview ?? '',
    popularity: match.popularity,
    genre_ids: genreIds,
    original_language: match.original_language ?? 'en',
    reason,
  };
}

/**
 * Find the TMDB entry the AI meant. Anime is searched as TV first (most
 * anime the AI names are series; movie-first matched "Death Note" to the
 * live-action film).
 */
async function findInTMDB(
  recommendation: AIRecommendation
): Promise<EnrichedRecommendation | null> {
  const { title, type, reason } = recommendation;
  // A missing year parses as 0; don't send that to TMDB as a filter.
  const year = recommendation.year && recommendation.year > 1870 ? recommendation.year : undefined;

  try {
    if (type === 'movie') {
      const movie = await searchBestMovie(title, year);
      return movie ? enrichMovie(movie, reason, recommendation.year) : null;
    }
    if (type === 'tv') {
      const show = await searchBestTV(title, year);
      return show ? enrichTV(show, reason, recommendation.year) : null;
    }
    // anime: TV first, then movie
    const show = await searchBestTV(title, year);
    if (show) return enrichTV(show, reason, recommendation.year);
    const movie = await searchBestMovie(title, year);
    if (movie) return enrichMovie(movie, reason, recommendation.year);

    console.warn(`Could not find "${title}" (${recommendation.year}) in TMDB`);
    return null;
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error);
    return null;
  }
}

/**
 * Enrich AI recommendations with TMDB data
 * Filters out recommendations that can't be found in TMDB
 */
async function enrichRecommendations(
  recommendations: AIRecommendation[],
  excludeIds?: number[]
): Promise<EnrichedRecommendation[]> {
  const excludeSet = new Set(excludeIds ?? []);

  // Search TMDB for each recommendation in parallel
  const enrichedPromises = recommendations.map((rec) => findInTMDB(rec));
  const enrichedResults = await Promise.all(enrichedPromises);

  // Filter out nulls (not found) and excluded IDs
  const validResults = enrichedResults.filter(
    (result): result is EnrichedRecommendation =>
      result !== null && !excludeSet.has(result.id)
  );

  // Deduplicate by ID (in case AI recommended same title twice)
  const seenIds = new Set<number>();
  const uniqueResults: EnrichedRecommendation[] = [];

  for (const result of validResults) {
    if (!seenIds.has(result.id)) {
      seenIds.add(result.id);
      uniqueResults.push(result);
    }
  }

  // Fetch streaming providers for each result in parallel
  // This enables the streaming filter feature
  const resultsWithProviders = await Promise.all(
    uniqueResults.map(async (result) => {
      return { ...result, ...(await getProviderIds(result.media_type, result.id)) };
    })
  );

  return resultsWithProviders;
}

/**
 * Drop results whose title the user named in the prompt (as whole words,
 * so "Up" isn't removed for "pick me up"; titles under 3 letters are kept).
 */
export function withoutNamedTitles<T extends { title: string }>(results: T[], prompt: string): T[] {
  const words = (value: string) => value.toLowerCase().replace(/&/g, 'and').split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const promptText = ` ${words(prompt).join(' ')} `;
  return results.filter((r) => {
    const title = words(r.title).join(' ');
    return title.replace(/ /g, '').length < 3 || !promptText.includes(` ${title} `);
  });
}

// ==========================================================================
// Main Discovery Function
// ==========================================================================

export interface DiscoveryResult {
  results: EnrichedRecommendation[];
  provider: string;
  isFallback: boolean;
}

/**
 * Get AI-powered recommendations for a prompt
 * - Tries each provider in the chain until one succeeds
 * - Retries failed providers with exponential backoff
 * - Enriches results with TMDB data
 * - Filters out excluded IDs
 */
/**
 * After this long, skip the remaining AI providers and go straight to the
 * TMDB fallback. Cloudflare drops requests at 100s, and three 45s attempts
 * per provider could otherwise take minutes.
 */
const CHAIN_DEADLINE_MS = 40000;

export async function getRecommendations(
  prompt: string,
  contentTypes?: ContentType[],
  excludeIds?: number[]
): Promise<DiscoveryResult> {
  let lastError: Error | null = null;
  const startTime = Date.now();

  // Try each provider in order
  for (let i = 0; i < AI_PROVIDERS.length; i++) {
    const provider = AI_PROVIDERS[i];
    if (!provider) continue;

    if (provider.name !== 'tmdb' && Date.now() - startTime > CHAIN_DEADLINE_MS) {
      console.warn(`[AI] Deadline passed, skipping ${provider.name}`);
      continue;
    }

    try {
      // Check if provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.log(`[AI] Provider ${provider.name} not available, trying next...`);
        continue;
      }

      console.log(`[AI] Using provider: ${provider.name}`);

      // Get raw recommendations with retry logic
      const rawRecommendations = await withRetry(
        () => provider.getRecommendations(prompt, contentTypes),
        provider.name
      );

      if (!rawRecommendations || rawRecommendations.length === 0) {
        console.warn(`[AI] Provider ${provider.name} returned no recommendations`);
        continue;
      }

      console.log(`[AI] Got ${rawRecommendations.length} raw recommendations from ${provider.name}`);

      // Enrich with TMDB data (with its own error handling). Models ignore
      // the "don't repeat titles the user named" rule ("thrillers like The
      // Martian" returned The Martian), so enforce it here.
      const enrichedResults = withoutNamedTitles(
        await enrichRecommendations(rawRecommendations, excludeIds),
        prompt
      );

      if (enrichedResults.length === 0) {
        console.warn(`[AI] No recommendations could be matched in TMDB, trying next provider...`);
        continue;
      }

      const duration = Date.now() - startTime;
      console.log(`[AI] Success: ${enrichedResults.length} results from ${provider.name} in ${duration}ms`);

      return {
        results: enrichedResults,
        provider: provider.name,
        isFallback: i > 0,
      };
    } catch (error) {
      console.error(`[AI] Provider ${provider.name} failed after retries:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      // Continue to next provider
    }
  }

  // All providers failed
  const duration = Date.now() - startTime;
  console.error(`[AI] All providers failed after ${duration}ms`);
  throw lastError ?? new Error('All AI providers failed');
}

// ==========================================================================
// Provider Status
// ==========================================================================

export interface ProviderStatus {
  name: string;
  available: boolean;
  reason?: string;
}

/**
 * Get status of all AI providers
 * Useful for debugging and status display
 */
export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const statuses: ProviderStatus[] = [];

  for (const provider of AI_PROVIDERS) {
    try {
      const available = await provider.isAvailable();
      statuses.push({
        name: provider.name,
        available,
        reason: available ? undefined : 'Rate limited or not configured',
      });
    } catch (error) {
      statuses.push({
        name: provider.name,
        available: false,
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return statuses;
}

/**
 * Check if primary AI (Gemini) is available
 */
export async function isPrimaryAIAvailable(): Promise<boolean> {
  return GeminiProvider.isAvailable();
}

// ==========================================================================
// Exports
// ==========================================================================

export * from './types';
export * from './intent-parser';
export { GeminiProvider } from './providers/gemini';
export { groqProvider } from './providers/groq';
export { deepseekProvider } from './providers/deepseek';
export { TasteDiveProvider } from './providers/tastedive';
export { TMDBProvider } from './providers/tmdb';
