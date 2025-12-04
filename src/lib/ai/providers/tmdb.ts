// ==========================================================================
// TMDB Fallback AI Provider
// Ultimate fallback - uses keyword parsing and TMDB discover
// ==========================================================================

import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import { parseUserIntent, generateReasonFromIntent } from '../intent-parser';
import type { AIProvider, AIRecommendation } from '../types';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const PROVIDER_NAME = 'tmdb';

// ==========================================================================
// TMDB Provider Implementation
// ==========================================================================

export const TMDBProvider: AIProvider = {
  name: PROVIDER_NAME,

  /**
   * TMDB is always available (no rate limits on our end)
   */
  async isAvailable(): Promise<boolean> {
    return true;
  },

  /**
   * Get recommendations using TMDB discover with parsed intent
   */
  async getRecommendations(
    prompt: string,
    contentTypes?: ContentType[]
  ): Promise<AIRecommendation[]> {
    const intent = parseUserIntent(prompt, contentTypes);
    const recommendations: AIRecommendation[] = [];

    // Build discover params
    const baseParams: Record<string, string | number> = {
      sort_by: intent.sortBy ?? 'popularity.desc',
      'vote_count.gte': 100, // Ensure some popularity
    };

    if (intent.genres.length > 0) {
      baseParams.with_genres = intent.genres.join(',');
    }

    if (intent.voteAverage) {
      baseParams['vote_average.gte'] = intent.voteAverage;
    }

    if (intent.yearRange?.gte) {
      baseParams['primary_release_date.gte'] = `${intent.yearRange.gte}-01-01`;
      baseParams['first_air_date.gte'] = `${intent.yearRange.gte}-01-01`;
    }

    if (intent.yearRange?.lte) {
      baseParams['primary_release_date.lte'] = `${intent.yearRange.lte}-12-31`;
      baseParams['first_air_date.lte'] = `${intent.yearRange.lte}-12-31`;
    }

    // Add language filter if specified
    if (intent.language) {
      baseParams.with_original_language = intent.language;
    }

    // Fetch movies and/or TV based on intent
    if (intent.mediaType === 'movie' || intent.mediaType === 'both') {
      try {
        const movieResults = await discoverMovies(baseParams);

        for (const movie of (movieResults.results ?? []).slice(0, 6)) {
          const genreIds = movie.genre_ids ?? [];
          const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
          const isJapanese = movie.original_language === 'ja';

          let type: 'movie' | 'tv' | 'anime' = 'movie';
          if (isAnimation && isJapanese) {
            type = 'anime';
          }

          recommendations.push({
            title: movie.title,
            year: movie.release_date ? new Date(movie.release_date).getFullYear() : 0,
            type,
            reason: generateReasonFromIntent(intent, movie),
          });
        }
      } catch (error) {
        console.error('TMDB movie discover error:', error);
      }
    }

    if (intent.mediaType === 'tv' || intent.mediaType === 'both') {
      try {
        const tvResults = await discoverTVShows(baseParams);

        for (const show of (tvResults.results ?? []).slice(0, 6)) {
          const genreIds = show.genre_ids ?? [];
          const originCountry = show.origin_country ?? [];
          const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
          const isJapanese = originCountry.includes('JP') || show.original_language === 'ja';

          let type: 'movie' | 'tv' | 'anime' = 'tv';
          if (isAnimation && isJapanese) {
            type = 'anime';
          }

          recommendations.push({
            title: show.name,
            year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 0,
            type,
            reason: generateReasonFromIntent(intent, show),
          });
        }
      } catch (error) {
        console.error('TMDB TV discover error:', error);
      }
    }

    // Limit and deduplicate
    const seen = new Set<string>();
    const unique: AIRecommendation[] = [];

    for (const rec of recommendations) {
      const key = `${rec.title}-${rec.year}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(rec);
      }
      if (unique.length >= 10) break;
    }

    if (unique.length === 0) {
      throw new Error('TMDB discover returned no results');
    }

    return unique;
  },
};

export default TMDBProvider;
