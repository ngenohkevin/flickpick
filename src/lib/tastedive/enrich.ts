// ==========================================================================
// TasteDive TMDB Enrichment
// Match TasteDive results to TMDB for posters, ratings, and full metadata
// ==========================================================================

import { searchMulti, type TMDBMultiSearchResult } from '@/lib/tmdb/search';
import { getCache, setCache } from '@/lib/redis';
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
 * Search TMDB for content by title using multi-search
 * This searches BOTH movies and TV shows and picks the best match
 * based on exact title match, popularity, and vote count
 */
async function findInTMDB(
  title: string
): Promise<EnrichedTasteDiveResult | null> {
  try {
    const response = await searchMulti(title);
    const results = response.results?.filter(
      (r): r is TMDBMultiSearchResult & { media_type: 'movie' | 'tv' } =>
        r.media_type === 'movie' || r.media_type === 'tv'
    );

    if (!results || results.length === 0) {
      return null;
    }

    // Get title from result for comparison
    const getResultTitle = (r: TMDBMultiSearchResult): string =>
      r.media_type === 'movie' ? (r.title ?? '') : (r.name ?? '');

    // Find exact title matches first
    const exactMatches = results.filter(
      (r) => getResultTitle(r).toLowerCase() === title.toLowerCase()
    );

    // If we have exact matches, pick the most popular one
    // Otherwise, score all results and pick the best
    let bestMatch: TMDBMultiSearchResult;

    if (exactMatches.length > 0) {
      // Among exact matches, prefer the one with most votes (more reliable)
      bestMatch = exactMatches.reduce((best, curr) =>
        (curr.vote_count ?? 0) > (best.vote_count ?? 0) ? curr : best
      );
    } else {
      // No exact match - score by title similarity, popularity, and vote count
      // Prefer results where title starts with our search term
      const scored = results.map((r) => {
        const resultTitle = getResultTitle(r).toLowerCase();
        const searchTitle = title.toLowerCase();

        let score = 0;
        // Title starts with search term
        if (resultTitle.startsWith(searchTitle)) score += 100;
        // Search term appears in title
        else if (resultTitle.includes(searchTitle)) score += 50;

        // Add popularity and vote count as tiebreakers
        score += Math.log10((r.popularity ?? 1) + 1) * 10;
        score += Math.log10((r.vote_count ?? 1) + 1) * 5;

        return { result: r, score };
      });

      scored.sort((a, b) => b.score - a.score);
      if (scored.length === 0 || !scored[0]) {
        return null;
      }
      bestMatch = scored[0].result;
    }

    const isMovie = bestMatch.media_type === 'movie';
    const genreIds = bestMatch.genre_ids ?? [];
    const originCountry = isMovie ? undefined : (bestMatch.origin_country ?? []);
    const year = isMovie
      ? (bestMatch.release_date ? new Date(bestMatch.release_date).getFullYear() : 0)
      : (bestMatch.first_air_date ? new Date(bestMatch.first_air_date).getFullYear() : 0);

    return {
      id: bestMatch.id,
      title: isMovie ? bestMatch.title! : bestMatch.name!,
      year,
      media_type: bestMatch.media_type as 'movie' | 'tv',
      content_type: getContentType(genreIds, originCountry, bestMatch.original_language, bestMatch.media_type as 'movie' | 'tv'),
      poster_path: bestMatch.poster_path ?? null,
      backdrop_path: bestMatch.backdrop_path ?? null,
      vote_average: bestMatch.vote_average ?? 0,
      vote_count: bestMatch.vote_count ?? 0,
      overview: bestMatch.overview ?? '',
      popularity: bestMatch.popularity ?? 0,
      genre_ids: genreIds,
      original_language: bestMatch.original_language ?? 'en',
    };
  } catch (error) {
    console.error(`Error searching TMDB for "${title}":`, error);
    return null;
  }
}

/**
 * Enrich a single TasteDive match with TMDB data
 * Uses multi-search to find the best match across movies and TV shows
 * (TasteDive often misclassifies content types, so we search both)
 */
async function enrichMatch(
  match: TasteDiveMatch
): Promise<EnrichedTasteDiveResult | null> {
  const result = await findInTMDB(match.name);

  if (result) {
    // Add TasteDive-specific data
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
  // Log incoming TasteDive results with type breakdown
  const incomingByType = matches.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`[TasteDive Enrich] Incoming ${matches.length} matches:`, incomingByType);
  console.log(`[TasteDive Enrich] Titles:`, matches.map(m => `${m.name} (${m.type})`).join(', '));

  const excludeSet = new Set(excludeIds ?? []);

  // Process in parallel for speed
  const enrichedPromises = matches.map((match) => enrichMatch(match));
  const enrichedResults = await Promise.all(enrichedPromises);

  // Log what was found vs missed
  const found: string[] = [];
  const missed: string[] = [];
  matches.forEach((match, i) => {
    if (enrichedResults[i]) {
      found.push(`${match.name} → ${enrichedResults[i]!.title} (${enrichedResults[i]!.media_type})`);
    } else {
      missed.push(match.name);
    }
  });

  console.log(`[TasteDive Enrich] TMDB matched ${found.length}/${matches.length}`);
  if (missed.length > 0) {
    console.log(`[TasteDive Enrich] TMDB missed:`, missed.join(', '));
  }

  // Filter out nulls (not found) and excluded IDs
  const validResults = enrichedResults.filter(
    (result): result is EnrichedTasteDiveResult =>
      result !== null && !excludeSet.has(result.id)
  );

  // Deduplicate by ID (TasteDive sometimes returns duplicates)
  const seenIds = new Set<number>();
  const uniqueResults: EnrichedTasteDiveResult[] = [];
  const duplicates: string[] = [];

  for (const result of validResults) {
    if (!seenIds.has(result.id)) {
      seenIds.add(result.id);
      uniqueResults.push(result);
    } else {
      duplicates.push(result.title);
    }
  }

  if (duplicates.length > 0) {
    console.log(`[TasteDive Enrich] Removed ${duplicates.length} duplicates:`, duplicates.join(', '));
  }

  // Log final breakdown by type
  const finalByType = uniqueResults.reduce((acc, r) => {
    acc[r.media_type] = (acc[r.media_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const finalByContentType = uniqueResults.reduce((acc, r) => {
    acc[r.content_type] = (acc[r.content_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`[TasteDive Enrich] Final ${uniqueResults.length} results - by media_type:`, finalByType, '- by content_type:', finalByContentType);

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

  // Check cache first
  const cached = await getCache<EnrichedTasteDiveResult[]>(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`[TasteDive] Cache hit for "${title}" (${cached.length} results)`);
    return cached;
  }

  // Fetch fresh data
  const { getSimilar } = await import('./client');
  const matches = await getSimilar(title, type, limit);

  if (matches.length === 0) {
    console.log(`[TasteDive] No matches for "${title}" - not caching`);
    return [];
  }

  const enriched = await enrichTasteDiveResults(matches, excludeIds);

  // Only cache if we got results (don't cache empty arrays)
  if (enriched.length > 0) {
    await setCache(cacheKey, enriched, TASTEDIVE_CONFIG.ENRICHED_CACHE_TTL);
    console.log(`[TasteDive] Cached ${enriched.length} enriched results for "${title}"`);
  } else {
    console.log(`[TasteDive] Enrichment returned 0 results for "${title}" - not caching`);
  }

  return enriched;
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

  // Check cache first
  const cached = await getCache<EnrichedTasteDiveResult[]>(cacheKey);
  if (cached && cached.length > 0) {
    console.log(`[TasteDive] Cache hit for blend (${cached.length} results)`);
    return cached;
  }

  // Fetch fresh data
  const { getBlend } = await import('./client');
  const matches = await getBlend(titles, type, limit);

  if (matches.length === 0) {
    console.log(`[TasteDive] No blend matches - not caching`);
    return [];
  }

  const enriched = await enrichTasteDiveResults(matches, excludeIds);

  // Only cache if we got results
  if (enriched.length > 0) {
    await setCache(cacheKey, enriched, TASTEDIVE_CONFIG.ENRICHED_CACHE_TTL);
    console.log(`[TasteDive] Cached ${enriched.length} enriched blend results`);
  } else {
    console.log(`[TasteDive] Blend enrichment returned 0 results - not caching`);
  }

  return enriched;
}
