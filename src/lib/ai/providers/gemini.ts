// ==========================================================================
// Gemini AI Provider
// Primary AI provider using Google's Gemini 2.0 Flash
// ==========================================================================

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { markAIProviderLimited, isAIProviderLimited } from '@/lib/redis';
import type { AIProvider, AIRecommendation } from '../types';
import { buildPrompt } from '../types';
import { parseAIResponse } from '../parser';
import type { ContentType } from '@/types';

// ==========================================================================
// Configuration
// ==========================================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.0-flash';
const PROVIDER_NAME = 'gemini';

// Configuration
const MAX_OUTPUT_TOKENS = 4096;  // Increased for better responses
const TEMPERATURE = 0.7;
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
        temperature: TEMPERATURE,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: 'application/json',
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

      console.log('[Gemini] Response received, parsing...');
      const recommendations = parseAIResponse(text, PROVIDER_NAME);

      if (recommendations.length === 0) {
        throw new Error('Gemini returned no valid recommendations');
      }

      console.log(`[Gemini] Parsed ${recommendations.length} recommendations`);
      return recommendations;
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
