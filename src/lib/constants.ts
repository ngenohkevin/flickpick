// ==========================================================================
// FlickPick Constants
// ==========================================================================

import type { Category, Mood } from '@/types';

// ==========================================================================
// Movie Genres (TMDB IDs)
// ==========================================================================

export const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// ==========================================================================
// TV Genres (TMDB IDs)
// ==========================================================================

export const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

// ==========================================================================
// Genre Pills (for homepage quick links)
// ==========================================================================

export const GENRE_PILLS = [
  { id: 28, name: 'Action', slug: 'action' },
  { id: 35, name: 'Comedy', slug: 'comedy' },
  { id: 18, name: 'Drama', slug: 'drama' },
  { id: 27, name: 'Horror', slug: 'horror' },
  { id: 878, name: 'Sci-Fi', slug: 'science-fiction' },
  { id: 10749, name: 'Romance', slug: 'romance' },
  { id: 53, name: 'Thriller', slug: 'thriller' },
  { id: 16, name: 'Animation', slug: 'animation' },
  { id: 99, name: 'Documentary', slug: 'documentary' },
  { id: 14, name: 'Fantasy', slug: 'fantasy' },
  { id: 80, name: 'Crime', slug: 'crime' },
  { id: 9648, name: 'Mystery', slug: 'mystery' },
] as const;

// ==========================================================================
// Genre Slug Mapping (for URLs)
// ==========================================================================

export const GENRE_SLUGS: Record<string, number> = {
  // Movies
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  'science-fiction': 878,
  'sci-fi': 878,
  thriller: 53,
  war: 10752,
  western: 37,
  // TV specific
  'action-adventure': 10759,
  kids: 10762,
  reality: 10764,
  'sci-fi-fantasy': 10765,
  'war-politics': 10768,
};

// ==========================================================================
// Keyword to Genre Mapping (for AI fallback)
// ==========================================================================

export const GENRE_KEYWORDS: Record<string, number[]> = {
  // Mood words
  scary: [27],
  horror: [27],
  terrifying: [27],
  creepy: [27],
  funny: [35],
  comedy: [35],
  hilarious: [35],
  romantic: [10749],
  love: [10749],
  action: [28],
  exciting: [28, 53],
  thriller: [53],
  suspense: [53],
  suspenseful: [53],
  tense: [53],
  sad: [18],
  emotional: [18],
  drama: [18],
  dramatic: [18],
  animated: [16],
  cartoon: [16],
  kids: [16, 10751],
  family: [10751],
  'family-friendly': [10751],
  documentary: [99],
  'sci-fi': [878],
  'science fiction': [878],
  scifi: [878],
  space: [878],
  fantasy: [14],
  magical: [14],
  mystery: [9648],
  crime: [80],
  detective: [80, 9648],
  war: [10752],
  western: [37],
  cowboy: [37],
  musical: [10402],
  history: [36],
  historical: [36],
  adventure: [12],
  epic: [12, 14],
};

// ==========================================================================
// Curated Categories
// ==========================================================================

export const CURATED_CATEGORIES: Category[] = [
  {
    slug: 'trending',
    name: 'Trending Now',
    description: "What everyone's watching right now",
    icon: 'TrendingUp',
  },
  {
    slug: 'new-releases',
    name: 'New Releases',
    description: 'Fresh content just released',
    icon: 'Sparkles',
  },
  {
    slug: 'top-rated',
    name: 'Top Rated',
    description: 'Critically acclaimed must-watches',
    icon: 'Star',
  },
  {
    slug: 'hidden-gems',
    name: 'Hidden Gems',
    description: 'Underrated titles worth discovering',
    icon: 'Gem',
  },
  {
    slug: 'award-winners',
    name: 'Award Winners',
    description: 'Oscar and Emmy winning content',
    icon: 'Trophy',
  },
  {
    slug: 'classics',
    name: 'Classics',
    description: 'Timeless films that defined cinema',
    icon: 'Film',
  },
  {
    slug: 'family-friendly',
    name: 'Family Friendly',
    description: 'Great for all ages',
    icon: 'Users',
  },
  {
    slug: 'international',
    name: 'International',
    description: 'The best from around the world',
    icon: 'Globe',
  },
];

// ==========================================================================
// Moods
// ==========================================================================

export const MOODS: Mood[] = [
  {
    slug: 'cozy',
    name: 'Cozy Night In',
    description: 'Warm, comforting content perfect for relaxing',
    emoji: '🛋️',
    gradient: 'from-orange-500 to-amber-600',
  },
  {
    slug: 'thrilling',
    name: 'Edge of Your Seat',
    description: 'Heart-pounding action and suspense',
    emoji: '🔥',
    gradient: 'from-red-500 to-orange-600',
  },
  {
    slug: 'mind-bending',
    name: 'Mind-Bending',
    description: 'Complex plots that make you think',
    emoji: '🧠',
    gradient: 'from-purple-500 to-indigo-600',
  },
  {
    slug: 'feel-good',
    name: 'Feel-Good',
    description: 'Uplifting stories to brighten your day',
    emoji: '☀️',
    gradient: 'from-yellow-400 to-orange-500',
  },
  {
    slug: 'dark',
    name: 'Dark & Gritty',
    description: 'Intense, mature storytelling',
    emoji: '🌑',
    gradient: 'from-gray-700 to-gray-900',
  },
  {
    slug: 'romantic',
    name: 'Romantic',
    description: 'Love stories that warm the heart',
    emoji: '💕',
    gradient: 'from-pink-500 to-rose-600',
  },
  {
    slug: 'nostalgic',
    name: 'Nostalgic',
    description: 'Beloved classics from years past',
    emoji: '📼',
    gradient: 'from-amber-500 to-yellow-600',
  },
  {
    slug: 'underrated',
    name: 'Hidden Gems',
    description: 'Overlooked but outstanding',
    emoji: '💎',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    slug: 'foreign',
    name: 'International Cinema',
    description: 'The best from around the world',
    emoji: '🌍',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    slug: 'binge-worthy',
    name: 'Binge-Worthy',
    description: 'Series you cannot stop watching',
    emoji: '📺',
    gradient: 'from-violet-500 to-purple-600',
  },
];

// ==========================================================================
// TMDB API Configuration
// ==========================================================================

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const POSTER_SIZES = {
  small: 'w185',
  medium: 'w342',
  large: 'w500',
  original: 'original',
} as const;

export const BACKDROP_SIZES = {
  small: 'w300',
  medium: 'w780',
  large: 'w1280',
  original: 'original',
} as const;

export const PROFILE_SIZES = {
  small: 'w45',
  medium: 'w185',
  large: 'h632',
  original: 'original',
} as const;

// ==========================================================================
// Animation Genre ID (for content type detection)
// ==========================================================================

export const ANIMATION_GENRE_ID = 16;

// ==========================================================================
// Languages (ISO 639-1 codes)
// ==========================================================================

export const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  hi: 'Hindi',
  ru: 'Russian',
  ar: 'Arabic',
  th: 'Thai',
  tr: 'Turkish',
  pl: 'Polish',
  nl: 'Dutch',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  fi: 'Finnish',
};

// ==========================================================================
// Streaming Providers (TMDB Provider IDs)
// ==========================================================================

export const STREAMING_PROVIDERS: { id: number; name: string; logo: string }[] = [
  { id: 8, name: 'Netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  { id: 9, name: 'Amazon Prime Video', logo: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
  { id: 337, name: 'Disney+', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  { id: 1899, name: 'Max', logo: '/6Q3ZYUNA9Hsgj6iWnVsw2gR5V6z.jpg' },
  { id: 15, name: 'Hulu', logo: '/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg' },
  { id: 386, name: 'Peacock', logo: '/8VCV78prwd9QzZnEm0ReO6bERDa.jpg' },
  { id: 531, name: 'Paramount+', logo: '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
  { id: 350, name: 'Apple TV+', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  { id: 283, name: 'Crunchyroll', logo: '/8Gt1iClBlzTeQs8WQm8rRwbNBNz.jpg' },
  { id: 2, name: 'Apple TV', logo: '/peURlLlr8jggOwK53fJ5wdQl05y.jpg' },
];

// ==========================================================================
// Default Values
// ==========================================================================

export const DEFAULT_COUNTRY = 'US';
export const DEFAULT_LANGUAGE = 'en-US';

// ==========================================================================
// Cache TTLs (in seconds)
// ==========================================================================

export const CACHE_TTL = {
  TRENDING: 3600, // 1 hour
  MOVIE_DETAILS: 86400, // 24 hours
  TV_DETAILS: 86400, // 24 hours
  SEARCH: 300, // 5 minutes
  SIMILAR: 86400, // 24 hours
  TASTEDIVE: 86400, // 24 hours (TasteDive results)
  BLEND: 86400, // 24 hours (Blend results)
  PROVIDERS: 21600, // 6 hours
  GENRES: 604800, // 7 days
} as const;

// ==========================================================================
// Rate Limiting
// ==========================================================================

export const RATE_LIMITS = {
  DISCOVER: { requests: 10, window: 60 }, // 10 req/min
  SEARCH: { requests: 30, window: 60 }, // 30 req/min
  DEFAULT: { requests: 100, window: 60 }, // 100 req/min
  TASTEDIVE: { requests: 300, window: 3600 }, // 300 req/hour (TasteDive limit)
} as const;
