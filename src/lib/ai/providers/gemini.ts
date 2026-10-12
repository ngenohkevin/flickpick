// ==========================================================================
// Gemini AI Provider
// Uses Gemini 3.6 Flash over the REST API (gemini-2.0-flash was shut down on
// 2026-06-01; the old @google/generative-ai SDK predates thinking controls).
// ==========================================================================

import { markAIProviderLimited, isAIProviderLimited } from '@/lib/redis';
import type { AIProvider, AIRecommendation } from '../types';
import { buildPrompt } from '../types';
import { parseAIResponse } from '../parser';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-3.6-flash';
const PROVIDER_NAME = 'gemini';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// maxOutputTokens includes thinking tokens; low thinking keeps responses fast.
const MAX_OUTPUT_TOKENS = 4096;
const TEMPERATURE = 0.7;
const RATE_LIMIT_TTL = 60;
const REQUEST_TIMEOUT = 45000;

// ==========================================================================
// Gemini Provider Implementation
// ==========================================================================

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
}

export const GeminiProvider: AIProvider = {
  name: PROVIDER_NAME,

  /**
   * Check if Gemini is available
   * - API key must be set
   * - Must not be rate limited
   */
  async isAvailable(): Promise<boolean> {
    if (!GEMINI_API_KEY) {
      return false;
    }

    // Check if we're rate limited
    const isLimited = await isAIProviderLimited(PROVIDER_NAME);
    return !isLimited;
  },

  /**
   * Get recommendations from Gemini
   */
  async getRecommendations(
    prompt: string,
    contentTypes?: ContentType[]
  ): Promise<AIRecommendation[]> {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(prompt, contentTypes) }] }],
          generationConfig: {
            temperature: TEMPERATURE,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingLevel: 'low' },
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 429) {
          console.warn('[Gemini] Rate limited, marking as unavailable');
          await markAIProviderLimited(PROVIDER_NAME, RATE_LIMIT_TTL);
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorBody}`);
      }

      const data = (await response.json()) as GeminiResponse;
      const text = data.candidates?.[0]?.content?.parts?.find((p) => !p.thought && p.text)?.text;

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      console.log('[Gemini] Response received, parsing...');
      const recommendations = parseAIResponse(text, PROVIDER_NAME);

      if (recommendations.length === 0) {
        throw new Error('Gemini returned no valid recommendations');
      }

      console.log(`[Gemini] Parsed ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Gemini request timed out');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  },
};

export default GeminiProvider;
