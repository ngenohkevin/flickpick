// ==========================================================================
// Gemini AI Provider
// Primary AI provider using Google's Gemini 2.0 Flash
// ==========================================================================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { markAIProviderLimited, isAIProviderLimited } from '@/lib/redis';
import type { AIProvider, AIRecommendation } from '../types';
import { buildPrompt } from '../types';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash';
const PROVIDER_NAME = 'gemini';

// Rate limit tracking (mark as limited for 60 seconds after 429)
const RATE_LIMIT_TTL = 60;

// ==========================================================================
// Gemini Client
// ==========================================================================

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI | null {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not set');
    return null;
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  return genAI;
}

// ==========================================================================
// Response Parsing
// ==========================================================================

/**
 * Parse the AI response into structured recommendations
 * Handles various response formats (with/without markdown code blocks)
 */
function parseResponse(text: string): AIRecommendation[] {
  // Remove markdown code blocks if present
  let cleanedText = text.trim();

  // Handle ```json ... ``` format
  if (cleanedText.startsWith('```')) {
    const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      cleanedText = jsonMatch[1].trim();
    }
  }

  // Try to find JSON array in the response
  const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    throw new Error('No JSON array found in response');
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    // Validate and clean each recommendation
    const recommendations: AIRecommendation[] = [];

    for (const item of parsed) {
      if (
        typeof item.title === 'string' &&
        typeof item.year === 'number' &&
        typeof item.type === 'string' &&
        typeof item.reason === 'string'
      ) {
        // Normalize type to valid values
        let type: 'movie' | 'tv' | 'anime' = 'movie';
        const itemType = item.type.toLowerCase();

        if (itemType === 'tv' || itemType === 'series' || itemType === 'show') {
          type = 'tv';
        } else if (itemType === 'anime') {
          type = 'anime';
        }

        recommendations.push({
          title: item.title.trim(),
          year: item.year,
          type,
          reason: item.reason.trim(),
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    console.error('Raw response:', text);
    throw new Error('Failed to parse AI response');
  }
}

// ==========================================================================
// Gemini Provider Implementation
// ==========================================================================

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
    const client = getClient();
    if (!client) {
      throw new Error('Gemini client not available');
    }

    const model = client.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const fullPrompt = buildPrompt(prompt, contentTypes);

    try {
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const text = response.text();

      if (!text) {
        throw new Error('Empty response from Gemini');
      }

      return parseResponse(text);
    } catch (error: unknown) {
      // Check for rate limiting (429 status)
      if (
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('rate'))
      ) {
        console.warn('Gemini rate limited, marking as unavailable');
        await markAIProviderLimited(PROVIDER_NAME, RATE_LIMIT_TTL);
      }

      throw error;
    }
  },
};

export default GeminiProvider;
