// ==========================================================================
// DeepSeek AI Provider
// Free tier alternative using DeepSeek's OpenAI-compatible API
// ==========================================================================

import { markAIProviderLimited, isAIProviderLimited } from '@/lib/redis';
import type { AIProvider, AIRecommendation } from '../types';
import { buildPrompt } from '../types';
import { parseAIResponse } from '../parser';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const BASE_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL_NAME = 'deepseek-chat'; // DeepSeek-V3
const PROVIDER_NAME = 'deepseek';

// Configuration
const MAX_TOKENS = 4000;      // Increased for better responses
const TEMPERATURE = 0.7;
const RATE_LIMIT_TTL = 60;
const REQUEST_TIMEOUT = 45000; // 45 seconds

// ==========================================================================
// DeepSeek Provider
// ==========================================================================

export const deepseekProvider: AIProvider = {
  name: PROVIDER_NAME,

  async isAvailable(): Promise<boolean> {
    if (!DEEPSEEK_API_KEY) {
      return false;
    }

    // Check if we're currently rate limited
    const isLimited = await isAIProviderLimited(PROVIDER_NAME);
    if (isLimited) {
      console.log('[DeepSeek] Currently rate limited, skipping');
      return false;
    }

    return true;
  },

  async getRecommendations(
    prompt: string,
    contentTypes?: ContentType[]
  ): Promise<AIRecommendation[]> {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('DEEPSEEK_API_KEY is not configured');
    }

    const fullPrompt = buildPrompt(prompt, contentTypes);

    console.log('[DeepSeek] Sending request...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: 'system',
              content: 'You are FlickPick, an expert movie and TV recommendation engine. Always respond with valid JSON only.',
            },
            {
              role: 'user',
              content: fullPrompt,
            },
          ],
          temperature: TEMPERATURE,
          max_tokens: MAX_TOKENS,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();

        // Handle rate limiting
        if (response.status === 429) {
          console.log('[DeepSeek] Rate limited, marking as unavailable');
          await markAIProviderLimited(PROVIDER_NAME, RATE_LIMIT_TTL);
        }

        throw new Error(`DeepSeek API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;

      if (!text) {
        throw new Error('DeepSeek returned empty response');
      }

      console.log('[DeepSeek] Response received, parsing...');
      const recommendations = parseAIResponse(text, PROVIDER_NAME);

      if (recommendations.length === 0) {
        throw new Error('DeepSeek returned no valid recommendations');
      }

      console.log(`[DeepSeek] Parsed ${recommendations.length} recommendations`);
      return recommendations;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('DeepSeek request timed out');
      }

      throw error;
    }
  },
};

export default deepseekProvider;
