// ==========================================================================
// Content Blend API Route
// POST /api/blend - Blend 2-3 titles to find similar content
// Primary: TasteDive, Fallback: Gemini AI
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getBlendEnriched, isTasteDiveAvailable } from '@/lib/tastedive';
import { getMovieDetails } from '@/lib/tmdb/movies';
import { getTVShowDetails } from '@/lib/tmdb/tv';
import { getMovieProviders, getTVProviders, getStreamingProviders } from '@/lib/tmdb/providers';
import { DEFAULT_COUNTRY } from '@/lib/constants';
import type { EnrichedTasteDiveResult } from '@/lib/tastedive';

// ==========================================================================
// Types
// ==========================================================================

const BlendRequestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number(),
        type: z.enum(['movie', 'tv']),
      })
    )
    .min(2, 'At least 2 items required')
    .max(5, 'Maximum 5 items allowed'),
});

interface BlendSourceItem {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  year: number;
}

interface BlendResult {
  id: number;
  title: string;
  media_type: 'movie' | 'tv';
  content_type: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  overview: string;
  year: number;
  blend_reason: string;
  providers?: number[]; // Streaming provider IDs for filtering
}

interface BlendResponse {
  source_items: BlendSourceItem[];
  results: BlendResult[];
  provider: 'tastedive' | 'gemini';
}

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Fetch title for a movie or TV show by ID
 */
async function fetchTitle(
  id: number,
  type: 'movie' | 'tv'
): Promise<BlendSourceItem | null> {
  try {
    if (type === 'movie') {
      const details = await getMovieDetails(id);
      return {
        id: details.id,
        title: details.title,
        type: 'movie',
        poster_path: details.poster_path,
        year: details.release_date ? new Date(details.release_date).getFullYear() : 0,
      };
    } else {
      const details = await getTVShowDetails(id);
      return {
        id: details.id,
        title: details.name,
        type: 'tv',
        poster_path: details.poster_path,
        year: details.first_air_date ? new Date(details.first_air_date).getFullYear() : 0,
      };
    }
  } catch (error) {
    console.error(`Error fetching ${type} ${id}:`, error);
    return null;
  }
}

/**
 * Fetch streaming provider IDs for a title
 */
async function getProviderIds(
  mediaType: 'movie' | 'tv',
  id: number
): Promise<number[]> {
  try {
    const response =
      mediaType === 'movie' ? await getMovieProviders(id) : await getTVProviders(id);

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
 * Generate a blend reason based on source items
 */
function generateBlendReason(sourceItems: BlendSourceItem[], result: EnrichedTasteDiveResult): string {
  const sourceNames = sourceItems.map((s) => s.title).slice(0, 2);

  if (result.tastedive_description) {
    return result.tastedive_description.slice(0, 150) + (result.tastedive_description.length > 150 ? '...' : '');
  }

  if (sourceNames.length === 2) {
    return `Combines elements of "${sourceNames[0]}" and "${sourceNames[1]}"`;
  }

  return `Similar to ${sourceNames.join(', ')}`;
}

/**
 * Convert enriched result to blend result
 */
function toBlendResult(
  result: EnrichedTasteDiveResult,
  sourceItems: BlendSourceItem[]
): BlendResult {
  return {
    id: result.id,
    title: result.title,
    media_type: result.media_type,
    content_type: result.content_type,
    poster_path: result.poster_path,
    backdrop_path: result.backdrop_path,
    vote_average: result.vote_average,
    overview: result.overview,
    year: result.year,
    blend_reason: generateBlendReason(sourceItems, result),
  };
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const validationResult = BlendRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          code: 'INVALID_INPUT',
          details: validationResult.error.issues.map((e) => e.message).join(', '),
        },
        { status: 400 }
      );
    }

    const { items } = validationResult.data;

    // Fetch source item details
    const sourcePromises = items.map((item) => fetchTitle(item.id, item.type));
    const sourceResults = await Promise.all(sourcePromises);
    const sourceItems = sourceResults.filter((s): s is BlendSourceItem => s !== null);

    if (sourceItems.length < 2) {
      return NextResponse.json(
        {
          error: 'Could not fetch at least 2 source items',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Get source IDs to exclude from results
    const excludeIds = sourceItems.map((s) => s.id);

    // Determine predominant type (use movie if mixed)
    const movieCount = sourceItems.filter((s) => s.type === 'movie').length;
    const predominantType: 'movie' | 'tv' = movieCount >= sourceItems.length / 2 ? 'movie' : 'tv';

    // Check TasteDive availability
    const tasteDiveAvailable = await isTasteDiveAvailable();
    let results: BlendResult[] = [];
    let provider: 'tastedive' | 'gemini' = 'tastedive';

    if (tasteDiveAvailable) {
      try {
        // Get titles for TasteDive query
        const titles = sourceItems.map((s) => s.title);

        // Fetch blended results from TasteDive (request 30 for more variety)
        const enrichedResults = await getBlendEnriched(
          titles,
          predominantType,
          30,
          excludeIds
        );

        if (enrichedResults.length > 0) {
          results = enrichedResults.map((r) => toBlendResult(r, sourceItems));
        }
      } catch (error) {
        console.warn('TasteDive blend failed:', error);
      }
    }

    // Fallback to Gemini if TasteDive failed
    if (results.length === 0) {
      provider = 'gemini';

      try {
        // Use AI provider for blend
        const { getRecommendations } = await import('@/lib/ai');
        const prompt = `Find movies and TV shows that combine the essence of: ${sourceItems.map((s) => `"${s.title}" (${s.year})`).join(', ')}. Look for content that shares themes, tone, or style with all of these.`;

        const aiResult = await getRecommendations(prompt, undefined, excludeIds);

        results = aiResult.results.map((r) => ({
          id: r.id,
          title: r.title,
          media_type: r.media_type,
          content_type: r.content_type,
          poster_path: r.poster_path,
          backdrop_path: r.backdrop_path,
          vote_average: r.vote_average,
          overview: r.overview,
          year: r.year,
          blend_reason: r.reason,
        }));

        // Use the actual provider that succeeded
        provider = aiResult.provider === 'gemini' ? 'gemini' : 'tastedive';
      } catch (error) {
        console.error('AI blend fallback failed:', error);
        return NextResponse.json(
          {
            error: 'Failed to generate blend recommendations',
            code: 'AI_ERROR',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // Fetch streaming providers for each result (in parallel, batched)
    const resultsWithProviders = await Promise.all(
      results.map(async (result) => {
        const providers = await getProviderIds(result.media_type, result.id);
        return { ...result, providers };
      })
    );

    const response: BlendResponse = {
      source_items: sourceItems,
      results: resultsWithProviders,
      provider,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Blend API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process blend request',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Cache blend results for 24 hours
export const revalidate = 86400;
