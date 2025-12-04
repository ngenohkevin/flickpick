// ==========================================================================
// TMDB Fallback AI Provider
// Ultimate fallback - uses keyword parsing and TMDB discover
// ==========================================================================

import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { GENRE_KEYWORDS, ANIMATION_GENRE_ID } from '@/lib/constants';
import type { AIProvider, AIRecommendation } from '../types';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const PROVIDER_NAME = 'tmdb';

// ==========================================================================
// Intent Parser
// ==========================================================================

interface ParsedIntent {
  genres: number[];
  yearRange?: { gte?: number; lte?: number };
  voteAverage?: number;
  sortBy?: string;
  keywords: string[];
  mediaType: 'movie' | 'tv' | 'both';
}

/**
 * Parse user intent from natural language prompt
 */
function parseUserIntent(prompt: string, contentTypes?: ContentType[]): ParsedIntent {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/\s+/);

  const intent: ParsedIntent = {
    genres: [],
    keywords: [],
    mediaType: 'both',
  };

  // Determine media type from content types or keywords
  if (contentTypes) {
    if (contentTypes.includes('tv') && !contentTypes.includes('movie')) {
      intent.mediaType = 'tv';
    } else if (contentTypes.includes('movie') && !contentTypes.includes('tv')) {
      intent.mediaType = 'movie';
    }
  }

  // Check for TV-specific keywords
  const tvKeywords = ['series', 'show', 'shows', 'tv', 'binge', 'episodes', 'seasons'];
  const movieKeywords = ['movie', 'movies', 'film', 'films', 'cinema'];

  for (const word of words) {
    if (tvKeywords.includes(word)) {
      intent.mediaType = 'tv';
    } else if (movieKeywords.includes(word)) {
      intent.mediaType = 'movie';
    }
  }

  // Extract genres from keywords
  for (const [keyword, genreIds] of Object.entries(GENRE_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      for (const genreId of genreIds) {
        if (!intent.genres.includes(genreId)) {
          intent.genres.push(genreId);
        }
      }
      intent.keywords.push(keyword);
    }
  }

  // Parse year mentions
  const currentYear = new Date().getFullYear();

  // "from the 90s", "90s movies"
  const decadeMatch = lowerPrompt.match(/(?:from\s+the\s+)?(\d{2})s/);
  if (decadeMatch && decadeMatch[1]) {
    const decade = parseInt(decadeMatch[1], 10);
    if (decade >= 50 && decade <= 90) {
      intent.yearRange = {
        gte: 1900 + decade,
        lte: 1900 + decade + 9,
      };
    } else if (decade >= 0 && decade <= 20) {
      intent.yearRange = {
        gte: 2000 + decade,
        lte: Math.min(2000 + decade + 9, currentYear),
      };
    }
  }

  // "recent", "new", "latest"
  if (lowerPrompt.match(/\b(recent|new|latest|modern)\b/)) {
    intent.yearRange = { gte: currentYear - 3 };
  }

  // "classic", "old", "vintage"
  if (lowerPrompt.match(/\b(classic|old|vintage|retro)\b/)) {
    intent.yearRange = { lte: 1999 };
  }

  // Parse quality preferences
  if (lowerPrompt.match(/\b(best|top|highly\s+rated|acclaimed|great)\b/)) {
    intent.voteAverage = 7.5;
  }

  if (lowerPrompt.match(/\b(underrated|hidden\s+gem|overlooked)\b/)) {
    intent.voteAverage = 7;
    intent.sortBy = 'vote_average.desc';
  }

  // Default sort
  if (!intent.sortBy) {
    if (intent.voteAverage) {
      intent.sortBy = 'vote_average.desc';
    } else {
      intent.sortBy = 'popularity.desc';
    }
  }

  return intent;
}

/**
 * Generate a reason for recommendation based on the intent
 */
function generateReason(
  intent: ParsedIntent,
  item: { title?: string; name?: string; vote_average?: number; release_date?: string; first_air_date?: string }
): string {
  const reasons: string[] = [];

  if (intent.keywords.length > 0) {
    reasons.push(`Matches your interest in ${intent.keywords.slice(0, 2).join(' and ')}`);
  }

  if (item.vote_average && item.vote_average >= 8) {
    reasons.push('critically acclaimed');
  } else if (item.vote_average && item.vote_average >= 7) {
    reasons.push('highly rated');
  }

  const date = item.release_date || item.first_air_date;
  if (date) {
    const year = new Date(date).getFullYear();
    if (intent.yearRange?.lte && year <= intent.yearRange.lte) {
      reasons.push('classic');
    } else if (year >= new Date().getFullYear() - 2) {
      reasons.push('recent release');
    }
  }

  if (reasons.length === 0) {
    reasons.push('Popular choice based on your preferences');
  }

  return reasons.join(' - ');
}

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
            reason: generateReason(intent, movie),
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
            reason: generateReason(intent, show),
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
