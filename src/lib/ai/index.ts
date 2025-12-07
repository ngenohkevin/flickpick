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
import { getMovieProviders, getTVProviders, getStreamingProviders } from '@/lib/tmdb/providers';
import { ANIMATION_GENRE_ID, DEFAULT_COUNTRY } from '@/lib/constants';
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
 * 1. Groq - Primary AI (truly free, 14,400 req/day, very fast)
 * 2. DeepSeek - Secondary (requires balance but cheap)
 * 3. Gemini - Tertiary (free tier hits limits quickly)
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

      // Don't retry on certain errors
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes('not configured') ||
        errorMessage.includes('api key') ||
        errorMessage.includes('insufficient balance')
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
 * Fetch streaming provider IDs for a title
 * Returns array of provider IDs (flatrate/ads only, not rent/buy)
 */
async function getProviderIds(
  mediaType: 'movie' | 'tv',
  id: number
): Promise<number[]> {
  try {
    const response = mediaType === 'movie'
      ? await getMovieProviders(id)
      : await getTVProviders(id);

    const countryProviders = response.results[DEFAULT_COUNTRY];
    if (!countryProviders) return [];

    const streamingProviders = getStreamingProviders(countryProviders);
    return streamingProviders.map((p) => p.provider_id);
  } catch (error) {
    console.warn(`Failed to fetch providers for ${mediaType}/${id}:`, error);
    return [];
  }
}

/**
 * Search TMDB for a title and return the best match
 */
async function findInTMDB(
  recommendation: AIRecommendation
): Promise<EnrichedRecommendation | null> {
  const { title, year, type, reason } = recommendation;

  try {
    // Determine search type based on AI recommendation
    // Anime can be either movie or TV, so we search both
    if (type === 'movie' || type === 'anime') {
      const movieResults = await searchMovies({
        query: title,
        primary_release_year: year,
      });

      // Find best match in movie results
      if (movieResults.results && movieResults.results.length > 0) {
        // Try exact year match first
        const exactMatch = movieResults.results.find((m) => {
          const releaseYear = m.release_date
            ? new Date(m.release_date).getFullYear()
            : null;
          return releaseYear === year;
        });

        // Fall back to first result if no exact match
        const match = exactMatch ?? movieResults.results[0];

        if (match) {
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
            year: match.release_date ? new Date(match.release_date).getFullYear() : year,
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
      }
    }

    // Search TV shows
    if (type === 'tv' || type === 'anime') {
      const tvResults = await searchTVShows({
        query: title,
        first_air_date_year: year,
      });

      if (tvResults.results && tvResults.results.length > 0) {
        // Try exact year match first
        const exactMatch = tvResults.results.find((s) => {
          const airYear = s.first_air_date
            ? new Date(s.first_air_date).getFullYear()
            : null;
          return airYear === year;
        });

        // Fall back to first result
        const match = exactMatch ?? tvResults.results[0];

        if (match) {
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
            year: match.first_air_date ? new Date(match.first_air_date).getFullYear() : year,
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
      }
    }

    // If anime didn't find results, try the opposite type
    if (type === 'anime') {
      // Already searched both above, so if we're here, no match found
      console.warn(`Could not find "${title}" (${year}) in TMDB`);
    }

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
      const providers = await getProviderIds(result.media_type, result.id);
      return { ...result, providers };
    })
  );

  return resultsWithProviders;
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

      // Enrich with TMDB data (with its own error handling)
      const enrichedResults = await enrichRecommendations(rawRecommendations, excludeIds);

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
