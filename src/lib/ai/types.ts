// ==========================================================================
// AI Provider Types
// Type definitions for AI recommendation system
// ==========================================================================

import type { ContentType } from '@/types';

// ==========================================================================
// AI Recommendation Types
// ==========================================================================

/**
 * Raw recommendation from AI provider (before TMDB enrichment)
 */
export interface AIRecommendation {
  title: string;
  year: number;
  type: 'movie' | 'tv' | 'anime';
  reason: string;
}

/**
 * Enriched recommendation with full TMDB data
 */
export interface EnrichedRecommendation {
  id: number;
  title: string;
  year: number;
  media_type: 'movie' | 'tv';
  content_type: ContentType;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  overview: string;
  popularity: number;
  genre_ids: number[];
  original_language: string;
  reason: string;
  /** Streaming provider IDs (for filtering) */
  providers?: number[];
}

// ==========================================================================
// AI Provider Interface
// ==========================================================================

/**
 * Interface for AI recommendation providers
 * Implement this interface to add new AI backends
 */
export interface AIProvider {
  /** Provider name for logging/tracking */
  name: string;

  /**
   * Check if provider is available (API key set, not rate limited)
   */
  isAvailable: () => Promise<boolean>;

  /**
   * Get recommendations for a natural language prompt
   * @param prompt User's natural language request
   * @param contentTypes Optional filter for content types
   * @returns Array of raw recommendations
   */
  getRecommendations: (
    prompt: string,
    contentTypes?: ContentType[]
  ) => Promise<AIRecommendation[]>;
}

// ==========================================================================
// Discovery Request/Response Types
// ==========================================================================

/**
 * Request body for /api/discover
 */
export interface DiscoverRequest {
  prompt: string;
  contentTypes?: ContentType[];
  excludeIds?: number[];
}

/**
 * Response from /api/discover
 */
export interface DiscoverResponse {
  results: EnrichedRecommendation[];
  provider: string;
  isFallback: boolean;
  prompt: string;
}

/**
 * Error response from /api/discover
 */
export interface DiscoverError {
  error: string;
  code: 'AI_ERROR' | 'RATE_LIMITED' | 'INVALID_INPUT' | 'TMDB_ERROR';
  details?: string;
}

// ==========================================================================
// Prompt Templates
// ==========================================================================

/**
 * System prompt for AI providers
 */
export const AI_SYSTEM_PROMPT = `You are FlickPick, an expert movie and TV recommendation engine.

TASK: Given the user's description, recommend exactly 10 titles (movies or TV shows).

CONTENT TYPES:
- movie: Feature films
- tv: TV series
- anime: Japanese animation (movies or series)

RULES:
1. Only recommend real, existing titles that were released before 2024
2. Mix content types unless user specifies (e.g., "anime only", "movies only")
3. Prioritize content from 1990-present unless user asks for classics
4. Diversify recommendations (different directors, studios, countries)
5. Match the MOOD and TONE, not just plot keywords
6. For anime requests, prefer highly-rated series (MAL 8+)
7. Consider both popular and lesser-known titles for variety
8. Never include unreleased or upcoming titles

OUTPUT FORMAT (strict JSON array, no markdown, no explanation):
[
  {
    "title": "Exact Title",
    "year": 2020,
    "type": "movie" | "tv" | "anime",
    "reason": "One compelling sentence explaining why this matches"
  }
]

IMPORTANT: Return ONLY the JSON array. No markdown code blocks, no additional text.`;

/**
 * Build the full prompt for AI
 */
export function buildPrompt(userPrompt: string, contentTypes?: ContentType[]): string {
  let typeHint = '';
  if (contentTypes && contentTypes.length > 0) {
    if (contentTypes.length === 1) {
      typeHint = `\n\nUSER PREFERS: Only ${contentTypes[0]} content`;
    } else {
      typeHint = `\n\nUSER PREFERS: ${contentTypes.join(', ')} content`;
    }
  }

  return `${AI_SYSTEM_PROMPT}${typeHint}\n\nUSER WANTS: ${userPrompt}`;
}

// ==========================================================================
// Example Prompts
// ==========================================================================

export const EXAMPLE_PROMPTS = [
  "A cozy anime series to watch on a rainy day",
  "Mind-bending thriller like Inception or Dark",
  "90s sitcom vibes with a modern twist",
  "Epic fantasy with great world-building",
  "Emotional drama that will make me cry",
  "Feel-good comedy for a lazy Sunday",
  "Dark crime series with complex characters",
  "Sci-fi that explores philosophical themes",
  "Heartwarming animated movies for adults",
  "Foreign films with stunning cinematography",
  "Underrated horror that's actually scary",
  "Coming-of-age stories with great soundtracks",
] as const;
