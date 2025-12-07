// ==========================================================================
// AI Response Parser
// Robust parsing of AI recommendation responses
// ==========================================================================

import type { AIRecommendation } from './types';

/**
 * Parse AI response text into structured recommendations
 * Handles various response formats with recovery attempts
 */
export function parseAIResponse(text: string, providerName: string): AIRecommendation[] {
  let cleanedText = text.trim();

  // Step 1: Remove markdown code blocks if present
  if (cleanedText.startsWith('```')) {
    const jsonMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch && jsonMatch[1]) {
      cleanedText = jsonMatch[1].trim();
    }
  }

  // Step 2: Try to extract JSON array from mixed content
  const jsonArrayMatch = cleanedText.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch) {
    cleanedText = jsonArrayMatch[0];
  }

  // Step 3: Handle JSON wrapped in object (some models do {"recommendations": [...]})
  if (cleanedText.startsWith('{')) {
    try {
      const wrapper = JSON.parse(cleanedText);
      // Look for common wrapper keys (models use various names)
      const arrayValue =
        wrapper.recommendations ||
        wrapper.results ||
        wrapper.movies ||
        wrapper.shows ||
        wrapper.data ||
        wrapper.items ||
        wrapper.output ||
        wrapper.response ||
        wrapper.answer ||
        wrapper.content ||
        wrapper.suggestions ||
        wrapper.titles ||
        wrapper.list;

      if (Array.isArray(arrayValue)) {
        cleanedText = JSON.stringify(arrayValue);
      } else {
        // Fallback: find any array value in the object
        const values = Object.values(wrapper);
        const arrayVal = values.find((v) => Array.isArray(v));
        if (arrayVal) {
          cleanedText = JSON.stringify(arrayVal);
        }
      }
    } catch {
      // Not a valid wrapper, continue with original
    }
  }

  // Step 4: Parse the JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (error) {
    // Step 5: Recovery - try to fix common JSON issues
    cleanedText = tryFixJSON(cleanedText);
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      console.error(`[${providerName}] Failed to parse response after recovery:`, error);
      console.error(`[${providerName}] Raw text:`, text.slice(0, 500));
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    console.error(`[${providerName}] Response is not an array:`, typeof parsed);
    return [];
  }

  // Step 6: Validate and normalize each recommendation
  const recommendations = parsed
    .filter((item): item is Record<string, unknown> => {
      return typeof item === 'object' && item !== null;
    })
    .map((item) => normalizeRecommendation(item))
    .filter((item): item is AIRecommendation => item !== null);

  if (recommendations.length === 0 && parsed.length > 0) {
    console.warn(`[${providerName}] Parsed ${parsed.length} items but none were valid recommendations`);
    console.warn(`[${providerName}] First item sample:`, JSON.stringify(parsed[0]).slice(0, 200));
  }

  return recommendations;
}

/**
 * Normalize a single recommendation item
 * Handles various field names and formats
 */
function normalizeRecommendation(item: Record<string, unknown>): AIRecommendation | null {
  // Extract title (various possible field names)
  const title =
    (typeof item.title === 'string' ? item.title : null) ||
    (typeof item.name === 'string' ? item.name : null) ||
    (typeof item.Title === 'string' ? item.Title : null) ||
    (typeof item.Name === 'string' ? item.Name : null);

  if (!title || title.length === 0) {
    return null;
  }

  // Extract year
  let year = 0;
  if (typeof item.year === 'number') {
    year = item.year;
  } else if (typeof item.year === 'string') {
    year = parseInt(item.year, 10);
  } else if (typeof item.Year === 'number') {
    year = item.Year;
  } else if (typeof item.Year === 'string') {
    year = parseInt(item.Year, 10);
  } else if (typeof item.release_year === 'number') {
    year = item.release_year;
  }

  // Extract type
  let type: 'movie' | 'tv' | 'anime' = 'movie';
  const rawType = (item.type || item.Type || item.media_type || item.mediaType || '').toString().toLowerCase();

  if (['tv', 'series', 'show', 'tvshow', 'tv_show'].includes(rawType)) {
    type = 'tv';
  } else if (['anime', 'animation'].includes(rawType)) {
    type = 'anime';
  } else if (['movie', 'film'].includes(rawType)) {
    type = 'movie';
  }

  // Extract reason
  const reason =
    (typeof item.reason === 'string' ? item.reason : null) ||
    (typeof item.Reason === 'string' ? item.Reason : null) ||
    (typeof item.description === 'string' ? item.description : null) ||
    (typeof item.explanation === 'string' ? item.explanation : null) ||
    'Recommended based on your preferences';

  return {
    title: title.trim(),
    year: isNaN(year) ? 0 : year,
    type,
    reason: reason.trim(),
  };
}

/**
 * Try to fix common JSON parsing issues
 */
function tryFixJSON(text: string): string {
  let fixed = text;

  // Remove trailing commas before ] or }
  fixed = fixed.replace(/,\s*([\]}])/g, '$1');

  // Fix unescaped quotes in strings (basic attempt)
  // This is tricky and might not work for all cases

  // Remove any control characters
  fixed = fixed.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Ensure proper string escaping for newlines
  fixed = fixed.replace(/\n/g, '\\n');

  return fixed;
}

/**
 * Validate that recommendations have minimum required data
 */
export function validateRecommendations(
  recommendations: AIRecommendation[],
  minCount: number = 3
): boolean {
  if (recommendations.length < minCount) {
    return false;
  }

  // Check that most recommendations have years (some tolerance for older titles)
  const withYears = recommendations.filter((r) => r.year > 1900);
  if (withYears.length < recommendations.length * 0.5) {
    return false;
  }

  return true;
}
