// ==========================================================================
// AI Discovery API Route
// POST /api/discover - Get AI-powered content recommendations
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getRecommendations, EXAMPLE_PROMPTS } from '@/lib/ai';
import {
  isRateLimited,
  getCachedPromptResults,
  cachePromptResults,
  trackPromptPopularity,
  normalizePrompt,
} from '@/lib/redis';
import { RATE_LIMITS } from '@/lib/constants';
import type { DiscoverResponse, DiscoverError } from '@/lib/ai/types';
import type { ContentType } from '@/types';
import type { DiscoveryResult } from '@/lib/ai';

// ==========================================================================
// Example Prompts Set (for quick lookup)
// Lazily initialized to avoid module load issues
// ==========================================================================

let examplePromptsSet: Set<string> | null = null;

function getExamplePromptsSet(): Set<string> {
  if (!examplePromptsSet) {
    examplePromptsSet = new Set(
      EXAMPLE_PROMPTS.map((p) => normalizePrompt(p))
    );
  }
  return examplePromptsSet;
}

// ==========================================================================
// Request Validation
// ==========================================================================

const DiscoverRequestSchema = z.object({
  prompt: z
    .string()
    .min(3, 'Prompt must be at least 3 characters')
    .max(500, 'Prompt must be less than 500 characters'),
  contentTypes: z
    .array(z.enum(['movie', 'tv', 'animation', 'anime']))
    .optional(),
  excludeIds: z.array(z.number()).optional(),
});

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIP = forwardedFor.split(',')[0];
    if (firstIP) {
      return firstIP.trim();
    }
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get client identifier for rate limiting
    const clientIP = getClientIP(request);

    // Check rate limit
    const isLimited = await isRateLimited(clientIP, 'discover', RATE_LIMITS.DISCOVER);
    if (isLimited) {
      const errorResponse: DiscoverError = {
        error: 'Too many requests. Please wait a moment and try again.',
        code: 'RATE_LIMITED',
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = DiscoverRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorResponse: DiscoverError = {
        error: 'Invalid request',
        code: 'INVALID_INPUT',
        details: validationResult.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', '),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { prompt, contentTypes, excludeIds } = validationResult.data;

    console.log(`[Discover] Processing request: "${prompt.substring(0, 50)}..."`);

    // Check if this is an example prompt (always cache these)
    const normalizedPrompt = normalizePrompt(prompt);
    const isExamplePrompt = getExamplePromptsSet().has(normalizedPrompt);

    // Check if we have cached results for this prompt
    // Only use cache if no excludeIds (personalized requests shouldn't use cache)
    const canUseCache = !excludeIds || excludeIds.length === 0;

    if (canUseCache) {
      const cachedResult = await getCachedPromptResults<DiscoveryResult>(prompt);

      if (cachedResult) {
        const duration = Date.now() - startTime;
        console.log(
          `[Discover] Cache hit in ${duration}ms - ${cachedResult.results.length} results`
        );

        const response: DiscoverResponse = {
          results: cachedResult.results,
          provider: cachedResult.provider,
          isFallback: cachedResult.isFallback,
          prompt,
        };

        return NextResponse.json(response);
      }
    }

    // Track prompt popularity (for automatic caching of popular searches)
    const shouldCache = await trackPromptPopularity(prompt);

    // Get AI recommendations
    const result = await getRecommendations(
      prompt,
      contentTypes as ContentType[] | undefined,
      excludeIds
    );

    // Cache the results if:
    // 1. This is an example prompt (always cache), OR
    // 2. This prompt has become popular (searched multiple times)
    if (canUseCache && (isExamplePrompt || shouldCache)) {
      // Example prompts get longer TTL (24h), popular prompts get 12h
      await cachePromptResults(prompt, result, isExamplePrompt ? 86400 : 43200);
    }

    const response: DiscoverResponse = {
      results: result.results,
      provider: result.provider,
      isFallback: result.isFallback,
      prompt,
    };

    const duration = Date.now() - startTime;
    const cacheStatus = isExamplePrompt ? ' (cached as example)' : shouldCache ? ' (cached as popular)' : '';
    console.log(
      `[Discover] Completed in ${duration}ms - ${result.results.length} results from ${result.provider}${cacheStatus}`
    );

    return NextResponse.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Discover] Error after ${duration}ms:`, error);

    // Check for specific error types
    if (error instanceof Error) {
      // Rate limit from AI provider
      if (
        error.message.includes('429') ||
        error.message.includes('quota') ||
        error.message.includes('rate')
      ) {
        const errorResponse: DiscoverError = {
          error: 'AI service is temporarily busy. Please try again in a moment.',
          code: 'RATE_LIMITED',
          details: error.message,
        };
        return NextResponse.json(errorResponse, { status: 503 });
      }

      // TMDB errors
      if (error.message.includes('TMDB')) {
        const errorResponse: DiscoverError = {
          error: 'Could not fetch content details. Please try again.',
          code: 'TMDB_ERROR',
          details: error.message,
        };
        return NextResponse.json(errorResponse, { status: 503 });
      }
    }

    // Generic AI error
    const errorResponse: DiscoverError = {
      error: 'Failed to generate recommendations. Please try again.',
      code: 'AI_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

// ==========================================================================
// Route Config
// ==========================================================================

// Dynamic route - caching is handled via Redis for:
// 1. Example prompts (always cached for 24h)
// 2. Popular prompts (cached for 12h after 3+ searches)
export const dynamic = 'force-dynamic';
