// ==========================================================================
// TasteDive AI Provider
// Secondary AI provider - extracts title mentions and uses TasteDive
// ==========================================================================

import {
  isTasteDiveAvailable,
  extractTitleMentions,
  getSimilar,
} from '@/lib/tastedive';
import { searchMovies, searchTVShows } from '@/lib/tmdb/search';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import type { AIProvider, AIRecommendation } from '../types';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const PROVIDER_NAME = 'tastedive';

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Search TMDB for a title and get its name for TasteDive query
 * This helps normalize user input to actual titles
 */
async function findTitleInTMDB(
  query: string,
  type: 'movie' | 'tv' = 'movie'
): Promise<string | null> {
  try {
    if (type === 'movie') {
      const results = await searchMovies({ query });
      const firstResult = results.results?.[0];
      if (firstResult) {
        return firstResult.title;
      }
    } else {
      const results = await searchTVShows({ query });
      const firstResult = results.results?.[0];
      if (firstResult) {
        return firstResult.name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert TasteDive match to AI recommendation format
 */
async function matchToRecommendation(
  name: string,
  type: 'movie' | 'tv'
): Promise<AIRecommendation | null> {
  try {
    if (type === 'movie') {
      const results = await searchMovies({ query: name });
      const match = results.results?.[0];
      if (!match) return null;

      const genreIds = match.genre_ids ?? [];
      const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
      const isJapanese = match.original_language === 'ja';

      let recType: 'movie' | 'tv' | 'anime' = 'movie';
      if (isAnimation && isJapanese) {
        recType = 'anime';
      }

      return {
        title: match.title,
        year: match.release_date ? new Date(match.release_date).getFullYear() : 0,
        type: recType,
        reason: `Similar to what you're looking for`,
      };
    } else {
      const results = await searchTVShows({ query: name });
      const match = results.results?.[0];
      if (!match) return null;

      const genreIds = match.genre_ids ?? [];
      const originCountry = match.origin_country ?? [];
      const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
      const isJapanese = originCountry.includes('JP') || match.original_language === 'ja';

      let recType: 'movie' | 'tv' | 'anime' = 'tv';
      if (isAnimation && isJapanese) {
        recType = 'anime';
      }

      return {
        title: match.name,
        year: match.first_air_date ? new Date(match.first_air_date).getFullYear() : 0,
        type: recType,
        reason: `Similar to what you're looking for`,
      };
    }
  } catch {
    return null;
  }
}

// ==========================================================================
// TasteDive Provider Implementation
// ==========================================================================

export const TasteDiveProvider: AIProvider = {
  name: PROVIDER_NAME,

  /**
   * Check if TasteDive is available
   */
  async isAvailable(): Promise<boolean> {
    return isTasteDiveAvailable();
  },

  /**
   * Get recommendations by extracting titles from prompt and querying TasteDive
   */
  async getRecommendations(
    prompt: string,
    contentTypes?: ContentType[]
  ): Promise<AIRecommendation[]> {
    // Extract title mentions from the prompt
    const titles = extractTitleMentions(prompt);

    if (titles.length === 0) {
      // Try to interpret the entire prompt as a search query
      // This is a last resort when no titles are explicitly mentioned
      throw new Error('No title mentions found in prompt');
    }

    // Determine if we should search for movies or TV
    const searchType: 'movie' | 'tv' =
      contentTypes?.includes('tv') && !contentTypes?.includes('movie')
        ? 'tv'
        : 'movie';

    // Normalize titles through TMDB first
    const normalizedTitles: string[] = [];
    for (const title of titles.slice(0, 3)) { // Limit to 3 titles
      const normalized = await findTitleInTMDB(title, searchType);
      if (normalized) {
        normalizedTitles.push(normalized);
      } else {
        // Use original title if not found
        normalizedTitles.push(title);
      }
    }

    if (normalizedTitles.length === 0) {
      throw new Error('Could not find any mentioned titles');
    }

    // Get similar content from TasteDive
    // Use the first title for single-title queries, or combine for blend
    const tasteDiveType = searchType === 'tv' ? 'tv' : 'movie';

    let matches;
    const firstTitle = normalizedTitles[0];
    if (normalizedTitles.length === 1 && firstTitle) {
      matches = await getSimilar(firstTitle, tasteDiveType, 15);
    } else {
      // Import getBlend dynamically to avoid circular dependency
      const { getBlend } = await import('@/lib/tastedive/client');
      matches = await getBlend(normalizedTitles, tasteDiveType, 15);
    }

    if (matches.length === 0) {
      throw new Error('TasteDive returned no results');
    }

    // Convert matches to recommendations
    const recommendations: AIRecommendation[] = [];
    const matchType = searchType === 'tv' ? 'tv' : 'movie';

    for (const match of matches) {
      const rec = await matchToRecommendation(match.name, matchType);
      if (rec) {
        // Update reason with TasteDive description if available
        if (match.description) {
          rec.reason = match.description.slice(0, 150) + (match.description.length > 150 ? '...' : '');
        }
        recommendations.push(rec);
      }

      // Limit to 10 recommendations
      if (recommendations.length >= 10) {
        break;
      }
    }

    return recommendations;
  },
};

export default TasteDiveProvider;
