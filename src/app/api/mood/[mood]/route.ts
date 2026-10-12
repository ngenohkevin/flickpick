// ==========================================================================
// Mood-Based Discovery API Route
// GET /api/mood/[mood] - Get recommendations for a specific mood
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getRecommendations } from '@/lib/ai';
import { getCache, setCache } from '@/lib/redis';
import type { DiscoveryResult } from '@/lib/ai';
import { MOODS, CACHE_TTL } from '@/lib/constants';
import type { DiscoverResponse, DiscoverError } from '@/lib/ai/types';

// ==========================================================================
// Mood Prompts
// ==========================================================================

const MOOD_PROMPTS: Record<string, string> = {
  cozy: 'Warm, comforting movies and shows perfect for a cozy night in. Think heartwarming stories, gentle animation, feel-good dramas',
  thrilling: 'Heart-pounding action and suspense. Edge-of-your-seat thrillers, intense action movies, gripping crime dramas',
  'mind-bending': 'Complex, thought-provoking content. Mind-bending sci-fi, psychological thrillers, movies with plot twists',
  'feel-good': 'Uplifting, happy content that brightens your day. Comedies, heartwarming dramas, inspirational stories',
  dark: 'Dark, gritty, mature storytelling. Noir, dark dramas, intense crime series, morally complex characters',
  romantic: 'Love stories and romance. Romantic comedies, dramatic love stories, relationship-focused content',
  nostalgic: 'Classic films and beloved shows from years past. 80s and 90s favorites, retro content, timeless classics',
  underrated: 'Hidden gems and overlooked masterpieces. Underrated films with high ratings but less popularity',
  foreign: 'International cinema from around the world. Korean, Japanese, French, Spanish films and series',
  'binge-worthy': 'TV series you cannot stop watching. Addictive dramas, engaging mysteries, compelling storylines',
};

// ==========================================================================
// Route Handler
// ==========================================================================

interface RouteContext {
  params: Promise<{ mood: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const startTime = Date.now();
  const { mood } = await context.params;

  try {
    // Validate mood
    const moodConfig = MOODS.find((m) => m.slug === mood);
    if (!moodConfig) {
      const errorResponse: DiscoverError = {
        error: `Invalid mood: ${mood}`,
        code: 'INVALID_INPUT',
        details: `Valid moods: ${MOODS.map((m) => m.slug).join(', ')}`,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Get prompt for this mood
    const prompt = MOOD_PROMPTS[mood] || `Content matching the ${moodConfig.name} mood`;

    // Cache key based on mood
    const cacheKey = `mood:${mood}:recommendations`;

    // Cached AI results last 24h; non-AI fallback results only 30 min so they
    // don't stick around after the AI recovers.
    let results = await getCache<DiscoveryResult>(cacheKey);
    if (!results) {
      console.log(`[Mood] Generating recommendations for: ${mood}`);
      results = await getRecommendations(prompt);
      const nonAI = results.provider === 'tmdb' || results.provider === 'tastedive';
      if (results.results.length > 0) {
        await setCache(cacheKey, results, nonAI ? 1800 : CACHE_TTL.SIMILAR);
      }
    }

    const response: DiscoverResponse = {
      results: results.results,
      provider: results.provider,
      isFallback: results.isFallback,
      prompt: moodConfig.name,
    };

    const duration = Date.now() - startTime;
    console.log(
      `[Mood] ${mood} - ${results.results.length} results from ${results.provider} in ${duration}ms`
    );

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Mood] Error for ${mood} after ${duration}ms:`, error);

    const errorResponse: DiscoverError = {
      error: 'Failed to get mood recommendations',
      code: 'AI_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// ==========================================================================
// Route Config
// ==========================================================================

export const dynamic = 'force-dynamic';
