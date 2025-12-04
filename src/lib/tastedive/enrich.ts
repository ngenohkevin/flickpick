// ==========================================================================
// TasteDive TMDB Enrichment
// Match TasteDive results to TMDB for posters, ratings, and full metadata
// ==========================================================================

import { searchMovies, searchTVShows } from '@/lib/tmdb/search';
import { getCached } from '@/lib/redis';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import type { TasteDiveMatch, EnrichedTasteDiveResult, NormalizedType } from './types';
import { tasteDiveCacheKeys, TASTEDIVE_CONFIG } from './types';
import type { ContentType } from '@/types';

// ==========================================================================
// Enrichment Functions
// ==========================================================================

/**
 * Determine content type from TMDB data
 */
function getContentType(
  genreIds: number[],
  originCountry: string[] | undefined,
  originalLanguage: string | undefined,
  mediaType: 'movie' | 'tv'
): ContentType {
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese =
    originCountry?.includes('JP') || originalLanguage === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return mediaType;
}

/**
 * Search TMDB for a movie by title
 */
async function findMovieInTMDB(
  title: string
): Promise<EnrichedTasteDiveResult | null> {
  try {
    const results = await searchMovies({ query: title });

    if (!results.results || results.results.length === 0) {
      return null;
    }

    // Find best match (prefer exact title match)
    const exactMatch = results.results.find(
      (m) => m.title?.toLowerCase() === title.toLowerCase()
    );
    const match = exactMatch ?? results.results[0];

    if (!match) return null;

    const genreIds = match.genre_ids ?? [];
    const releaseYear = match.release_date
      ? new Date(match.release_date).getFullYear()
      : 0;

    return {
      id: match.id,
      title: match.title,
      year: releaseYear,
      media_type: 'movie',
      content_type: getContentType(genreIds, undefined, match.original_language, 'movie'),
      poster_path: match.poster_path ?? null,
      backdrop_path: match.backdrop_path ?? null,
      vote_average: match.vote_average ?? 0,
      vote_count: match.vote_count ?? 0,
      overview: match.overview ?? '',
      popularity: match.popularity ?? 0,
      genre_ids: genreIds,
      original_language: match.original_language ?? 'en',
    };
  } catch (error) {
    console.error(`Error searching TMDB for movie "${title}":`, error);
    return null;
  }
}

/**
 * Search TMDB for a TV show by title
 */
async function findTVShowInTMDB(
  title: string
): Promise<EnrichedTasteDiveResult | null> {
  try {
    const results = await searchTVShows({ query: title });

    if (!results.results || results.results.length === 0) {
      return null;
    }

    // Find best match (prefer exact title match)
    const exactMatch = results.results.find(
      (s) => s.name?.toLowerCase() === title.toLowerCase()
    );
    const match = exactMatch ?? results.results[0];

    if (!match) return null;

    const genreIds = match.genre_ids ?? [];
    const originCountry = match.origin_country ?? [];
    const firstAirYear = match.first_air_date
      ? new Date(match.first_air_date).getFullYear()
      : 0;

    return {
      id: match.id,
      title: match.name,
      year: firstAirYear,
      media_type: 'tv',
      content_type: getContentType(genreIds, originCountry, match.original_language, 'tv'),
      poster_path: match.poster_path ?? null,
      backdrop_path: match.backdrop_path ?? null,
      vote_average: match.vote_average ?? 0,
      vote_count: match.vote_count ?? 0,
      overview: match.overview ?? '',
      popularity: match.popularity ?? 0,
      genre_ids: genreIds,
      original_language: match.original_language ?? 'en',
    };
  } catch (error) {
    console.error(`Error searching TMDB for TV show "${title}":`, error);
    return null;
  }
}

/**
 * Enrich a single TasteDive match with TMDB data
 */
async function enrichMatch(
  match: TasteDiveMatch
): Promise<EnrichedTasteDiveResult | null> {
  let result: EnrichedTasteDiveResult | null = null;

  if (match.type === 'movie') {
    result = await findMovieInTMDB(match.name);
  } else {
    result = await findTVShowInTMDB(match.name);
  }

  if (result) {
    // Add TasteDive-specific data
    return {
      ...result,
      tastedive_description: match.description,
      youtube_url: match.youtubeUrl,
    };
  }

  // If not found with original type, try the opposite
  // (TasteDive sometimes misclassifies movies as shows or vice versa)
  if (match.type === 'movie') {
    result = await findTVShowInTMDB(match.name);
  } else {
    result = await findMovieInTMDB(match.name);
  }

  if (result) {
    return {
      ...result,
      tastedive_description: match.description,
      youtube_url: match.youtubeUrl,
    };
  }

  return null;
}

/**
 * Enrich multiple TasteDive matches with TMDB data
 * Filters out matches that can't be found in TMDB
 * @param matches TasteDive matches to enrich
 * @param excludeIds Optional TMDB IDs to exclude from results
 */
export async function enrichTasteDiveResults(
  matches: TasteDiveMatch[],
  excludeIds?: number[]
): Promise<EnrichedTasteDiveResult[]> {
  const excludeSet = new Set(excludeIds ?? []);

  // Process in parallel for speed
  const enrichedPromises = matches.map((match) => enrichMatch(match));
  const enrichedResults = await Promise.all(enrichedPromises);

  // Filter out nulls (not found) and excluded IDs
  const validResults = enrichedResults.filter(
    (result): result is EnrichedTasteDiveResult =>
      result !== null && !excludeSet.has(result.id)
  );

  // Deduplicate by ID (TasteDive sometimes returns duplicates)
  const seenIds = new Set<number>();
  const uniqueResults: EnrichedTasteDiveResult[] = [];

  for (const result of validResults) {
    if (!seenIds.has(result.id)) {
      seenIds.add(result.id);
      uniqueResults.push(result);
    }
  }

  return uniqueResults;
}

/**
 * Get similar content from TasteDive and enrich with TMDB data
 * This is a convenience function that combines fetching and enrichment
 * Results are cached for 7 days to minimize API calls
 */
export async function getSimilarEnriched(
  title: string,
  type: NormalizedType = 'movie',
  limit: number = 20,
  excludeIds?: number[]
): Promise<EnrichedTasteDiveResult[]> {
  const cacheKey = tasteDiveCacheKeys.similarEnriched(type, title);

  return getCached<EnrichedTasteDiveResult[]>(
    cacheKey,
    async () => {
      // Import here to avoid circular dependency
      const { getSimilar } = await import('./client');

      const matches = await getSimilar(title, type, limit);

      if (matches.length === 0) {
        return [];
      }

      return enrichTasteDiveResults(matches, excludeIds);
    },
    TASTEDIVE_CONFIG.ENRICHED_CACHE_TTL
  );
}

/**
 * Get blended content from TasteDive and enrich with TMDB data
 * This is a convenience function that combines fetching and enrichment
 * Results are cached for 7 days to minimize API calls
 */
export async function getBlendEnriched(
  titles: string[],
  type: NormalizedType = 'movie',
  limit: number = 20,
  excludeIds?: number[]
): Promise<EnrichedTasteDiveResult[]> {
  const cacheKey = tasteDiveCacheKeys.blendEnriched(titles);

  return getCached<EnrichedTasteDiveResult[]>(
    cacheKey,
    async () => {
      // Import here to avoid circular dependency
      const { getBlend } = await import('./client');

      const matches = await getBlend(titles, type, limit);

      if (matches.length === 0) {
        return [];
      }

      return enrichTasteDiveResults(matches, excludeIds);
    },
    TASTEDIVE_CONFIG.ENRICHED_CACHE_TTL
  );
}
