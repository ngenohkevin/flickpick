// ==========================================================================
// Intent Parser
// Parses natural language prompts into structured discovery parameters
// Used as fallback when AI providers are unavailable
// ==========================================================================

import { GENRE_KEYWORDS } from '@/lib/constants';
import type { ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

/**
 * Parsed user intent from natural language prompt
 */
export interface ParsedIntent {
  /** Genre IDs extracted from keywords */
  genres: number[];
  /** Year range filter */
  yearRange?: { gte?: number; lte?: number };
  /** Minimum vote average */
  voteAverage?: number;
  /** Sort order for TMDB discover */
  sortBy?: string;
  /** Keywords that were matched */
  keywords: string[];
  /** Detected media type preference */
  mediaType: 'movie' | 'tv' | 'both';
  /** Mood detected from prompt */
  mood?: string;
  /** Original language preference */
  language?: string;
}

// ==========================================================================
// Keyword Mappings
// ==========================================================================

/** Keywords that indicate TV content */
const TV_KEYWORDS = [
  'series',
  'show',
  'shows',
  'tv',
  'binge',
  'episodes',
  'seasons',
  'miniseries',
  'sitcom',
  'drama series',
];

/** Keywords that indicate movie content */
const MOVIE_KEYWORDS = [
  'movie',
  'movies',
  'film',
  'films',
  'cinema',
  'feature',
  'blockbuster',
];

/** Keywords that indicate anime content */
const ANIME_KEYWORDS = [
  'anime',
  'manga',
  'japanese animation',
  'studio ghibli',
  'shonen',
  'seinen',
  'isekai',
  'mecha',
];

/** Mood keywords for enhanced matching */
const MOOD_KEYWORDS: Record<string, string[]> = {
  cozy: ['cozy', 'comforting', 'warm', 'relaxing', 'peaceful', 'calm', 'soothing'],
  thrilling: ['thrilling', 'intense', 'edge of seat', 'suspenseful', 'tense', 'gripping'],
  'mind-bending': ['mind-bending', 'complex', 'thought-provoking', 'cerebral', 'twist'],
  'feel-good': ['feel-good', 'uplifting', 'heartwarming', 'happy', 'joyful', 'wholesome'],
  dark: ['dark', 'gritty', 'mature', 'intense', 'bleak', 'noir'],
  romantic: ['romantic', 'love story', 'romance', 'relationship'],
  nostalgic: ['nostalgic', 'retro', 'classic', 'throwback', 'vintage'],
  scary: ['scary', 'terrifying', 'creepy', 'horrifying', 'spooky', 'frightening'],
};

/** Language keywords */
const LANGUAGE_KEYWORDS: Record<string, string> = {
  korean: 'ko',
  'k-drama': 'ko',
  kdrama: 'ko',
  japanese: 'ja',
  'j-drama': 'ja',
  french: 'fr',
  spanish: 'es',
  german: 'de',
  italian: 'it',
  chinese: 'zh',
  indian: 'hi',
  bollywood: 'hi',
  thai: 'th',
  turkish: 'tr',
  scandinavian: 'sv',
  nordic: 'sv',
};

// ==========================================================================
// Parser Functions
// ==========================================================================

/**
 * Parse user intent from natural language prompt
 * Extracts genres, year ranges, quality preferences, and media type
 */
export function parseUserIntent(
  prompt: string,
  contentTypes?: ContentType[]
): ParsedIntent {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/\s+/);

  const intent: ParsedIntent = {
    genres: [],
    keywords: [],
    mediaType: 'both',
  };

  // Determine media type from content types filter
  if (contentTypes && contentTypes.length > 0) {
    if (contentTypes.includes('tv') && !contentTypes.includes('movie')) {
      intent.mediaType = 'tv';
    } else if (contentTypes.includes('movie') && !contentTypes.includes('tv')) {
      intent.mediaType = 'movie';
    }
    // Check for anime preference
    if (contentTypes.includes('anime')) {
      intent.keywords.push('anime');
    }
  }

  // Detect media type from keywords
  for (const word of words) {
    if (TV_KEYWORDS.includes(word)) {
      intent.mediaType = 'tv';
    } else if (MOVIE_KEYWORDS.includes(word)) {
      intent.mediaType = 'movie';
    }
  }

  // Check for anime keywords
  for (const keyword of ANIME_KEYWORDS) {
    if (lowerPrompt.includes(keyword)) {
      intent.keywords.push('anime');
      break;
    }
  }

  // Extract genres from keyword mapping
  for (const [keyword, genreIds] of Object.entries(GENRE_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      for (const genreId of genreIds) {
        if (!intent.genres.includes(genreId)) {
          intent.genres.push(genreId);
        }
      }
      if (!intent.keywords.includes(keyword)) {
        intent.keywords.push(keyword);
      }
    }
  }

  // Detect mood
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        intent.mood = mood;
        break;
      }
    }
    if (intent.mood) break;
  }

  // Detect language preference
  for (const [keyword, langCode] of Object.entries(LANGUAGE_KEYWORDS)) {
    if (lowerPrompt.includes(keyword)) {
      intent.language = langCode;
      break;
    }
  }

  // Parse year/decade mentions
  intent.yearRange = parseYearRange(lowerPrompt);

  // Parse quality preferences
  parseQualityPreferences(lowerPrompt, intent);

  // Set default sort
  if (!intent.sortBy) {
    if (intent.voteAverage) {
      intent.sortBy = 'vote_average.desc';
    } else {
      intent.sortBy = 'popularity.desc';
    }
  }

  return intent;
}

/**
 * Parse year range from prompt
 */
function parseYearRange(
  prompt: string
): { gte?: number; lte?: number } | undefined {
  const currentYear = new Date().getFullYear();

  // Match explicit year ranges: "from 2010 to 2020", "2015-2020"
  const rangeMatch = prompt.match(
    /(?:from\s+)?(\d{4})\s*(?:to|-)\s*(\d{4})/
  );
  if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
    return {
      gte: parseInt(rangeMatch[1], 10),
      lte: parseInt(rangeMatch[2], 10),
    };
  }

  // Match single year: "from 2020", "after 2015"
  const afterMatch = prompt.match(/(?:from|after|since)\s+(\d{4})/);
  if (afterMatch && afterMatch[1]) {
    return { gte: parseInt(afterMatch[1], 10) };
  }

  const beforeMatch = prompt.match(/(?:before|until|up to)\s+(\d{4})/);
  if (beforeMatch && beforeMatch[1]) {
    return { lte: parseInt(beforeMatch[1], 10) };
  }

  // Match decades: "90s", "from the 80s"
  const decadeMatch = prompt.match(/(?:from\s+the\s+)?(\d{2})s/);
  if (decadeMatch && decadeMatch[1]) {
    const decade = parseInt(decadeMatch[1], 10);
    if (decade >= 50 && decade <= 90) {
      return {
        gte: 1900 + decade,
        lte: 1900 + decade + 9,
      };
    } else if (decade >= 0 && decade <= 20) {
      return {
        gte: 2000 + decade,
        lte: Math.min(2000 + decade + 9, currentYear),
      };
    }
  }

  // Match relative time keywords
  if (prompt.match(/\b(recent|new|latest|modern|current)\b/)) {
    return { gte: currentYear - 3 };
  }

  if (prompt.match(/\b(classic|old|vintage|retro|golden age)\b/)) {
    return { lte: 1999 };
  }

  if (prompt.match(/\b(80s|eighties)\b/i)) {
    return { gte: 1980, lte: 1989 };
  }

  if (prompt.match(/\b(70s|seventies)\b/i)) {
    return { gte: 1970, lte: 1979 };
  }

  return undefined;
}

/**
 * Parse quality/rating preferences
 */
function parseQualityPreferences(prompt: string, intent: ParsedIntent): void {
  // High quality indicators
  if (prompt.match(/\b(best|top|highly\s+rated|acclaimed|award.?winning|masterpiece)\b/)) {
    intent.voteAverage = 8;
    intent.sortBy = 'vote_average.desc';
  }

  // Good quality
  if (prompt.match(/\b(good|great|excellent|quality)\b/) && !intent.voteAverage) {
    intent.voteAverage = 7.5;
  }

  // Hidden gems / underrated
  if (prompt.match(/\b(underrated|hidden\s+gem|overlooked|lesser.?known|obscure)\b/)) {
    intent.voteAverage = 7;
    intent.sortBy = 'vote_average.desc';
    // Hidden gems should have lower popularity/vote count (handled in TMDB provider)
  }

  // Popular content
  if (prompt.match(/\b(popular|trending|mainstream|blockbuster|hit)\b/)) {
    intent.sortBy = 'popularity.desc';
  }
}

/**
 * Generate a human-readable reason based on parsed intent
 */
export function generateReasonFromIntent(
  intent: ParsedIntent,
  item: {
    title?: string;
    name?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
  }
): string {
  const reasons: string[] = [];

  // Add keyword-based reason
  if (intent.keywords.length > 0) {
    const keywordStr = intent.keywords.slice(0, 2).join(' and ');
    reasons.push(`Matches your interest in ${keywordStr}`);
  }

  // Add mood-based reason
  if (intent.mood) {
    reasons.push(`Perfect for a ${intent.mood} mood`);
  }

  // Add rating-based reason
  if (item.vote_average) {
    if (item.vote_average >= 8.5) {
      reasons.push('exceptional ratings');
    } else if (item.vote_average >= 8) {
      reasons.push('critically acclaimed');
    } else if (item.vote_average >= 7.5) {
      reasons.push('highly rated');
    }
  }

  // Add era-based reason
  const date = item.release_date || item.first_air_date;
  if (date) {
    const year = new Date(date).getFullYear();
    const currentYear = new Date().getFullYear();

    if (intent.yearRange?.lte && year <= intent.yearRange.lte && year < 2000) {
      reasons.push('beloved classic');
    } else if (year >= currentYear - 2) {
      reasons.push('recent release');
    }
  }

  // Default reason if none matched
  if (reasons.length === 0) {
    reasons.push('Popular choice based on your preferences');
  }

  return reasons.join(' - ');
}

/**
 * Extract title mentions from a prompt
 * Used by TasteDive provider to find similar content
 */
export function extractTitleMentions(prompt: string): string[] {
  const titles: string[] = [];

  // Match quoted titles (both single and double quotes)
  const quotedMatches = prompt.match(/["']([^"']+)["']/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const title = match.slice(1, -1).trim();
      if (title.length > 0) {
        titles.push(title);
      }
    }
  }

  // Match "like X" or "similar to X" patterns
  const likePatterns = [
    /(?:like|similar to|reminds? (?:me )?of)\s+([A-Z][^,."'\n]+)/gi,
    /movies?\s+(?:like|such as)\s+([A-Z][^,."'\n]+)/gi,
    /shows?\s+(?:like|such as)\s+([A-Z][^,."'\n]+)/gi,
    /(?:another|more)\s+([A-Z][^,."'\n]+)/gi,
  ];

  for (const pattern of likePatterns) {
    const matches = prompt.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const title = match[1].trim();
        // Avoid common false positives
        const skipWords = ['The', 'A', 'An', 'This', 'That', 'Like', 'Similar', 'Something'];
        if (title.length > 2 && !skipWords.includes(title)) {
          titles.push(title);
        }
      }
    }
  }

  // Deduplicate
  return [...new Set(titles)];
}

// ==========================================================================
// Exports
// ==========================================================================

export {
  TV_KEYWORDS,
  MOVIE_KEYWORDS,
  ANIME_KEYWORDS,
  MOOD_KEYWORDS,
  LANGUAGE_KEYWORDS,
};
