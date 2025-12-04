// ==========================================================================
// AI Recommendation System
// Provider orchestration with fallback and TMDB enrichment
// ==========================================================================

import { GeminiProvider } from './providers/gemini';
import { TasteDiveProvider } from './providers/tastedive';
import { TMDBProvider } from './providers/tmdb';
import { searchMovies, searchTVShows } from '@/lib/tmdb/search';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
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
 * 1. Gemini - Primary AI for natural language understanding
 * 2. TasteDive - Secondary, extracts titles and finds similar content
 * 3. TMDB - Ultimate fallback, uses keyword→genre mapping + discover
 */
const AI_PROVIDERS: AIProvider[] = [
  GeminiProvider,
  TasteDiveProvider,
  TMDBProvider,
];

// ==========================================================================
// TMDB Enrichment
// ==========================================================================

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

  return uniqueResults;
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
 * - Enriches results with TMDB data
 * - Filters out excluded IDs
 */
export async function getRecommendations(
  prompt: string,
  contentTypes?: ContentType[],
  excludeIds?: number[]
): Promise<DiscoveryResult> {
  let lastError: Error | null = null;
  let isFallback = false;

  // Try each provider in order
  for (let i = 0; i < AI_PROVIDERS.length; i++) {
    const provider = AI_PROVIDERS[i];
    if (!provider) continue;

    try {
      // Check if provider is available
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.log(`Provider ${provider.name} not available, trying next...`);
        isFallback = true;
        continue;
      }

      console.log(`Using AI provider: ${provider.name}`);

      // Get raw recommendations from AI
      const rawRecommendations = await provider.getRecommendations(prompt, contentTypes);

      if (!rawRecommendations || rawRecommendations.length === 0) {
        console.warn(`Provider ${provider.name} returned no recommendations`);
        isFallback = true;
        continue;
      }

      console.log(`Got ${rawRecommendations.length} recommendations from ${provider.name}`);

      // Enrich with TMDB data
      const enrichedResults = await enrichRecommendations(rawRecommendations, excludeIds);

      if (enrichedResults.length === 0) {
        console.warn(`No recommendations could be matched in TMDB`);
        isFallback = true;
        continue;
      }

      return {
        results: enrichedResults,
        provider: provider.name,
        isFallback: i > 0, // It's a fallback if we're not on the first provider
      };
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      isFallback = true;
      // Continue to next provider
    }
  }

  // All providers failed
  throw lastError ?? new Error('All AI providers failed');
}

// ==========================================================================
// Exports
// ==========================================================================

export * from './types';
export { GeminiProvider } from './providers/gemini';
export { TasteDiveProvider } from './providers/tastedive';
export { TMDBProvider } from './providers/tmdb';
