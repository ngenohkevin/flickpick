// ==========================================================================
// Personalized Recommendations API Route
// POST /api/recommendations - Get personalized recommendations based on watchlist
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { getSimilarMovies, getMovieRecommendations, toMovie } from '@/lib/tmdb/movies';
import { getSimilarTVShows, getTVShowRecommendations, toTVShow } from '@/lib/tmdb/tv';
import { MOVIE_GENRES, TV_GENRES } from '@/lib/constants';
import type { MediaType, Content, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface RecommendationsRequest {
  watchlistItems: WatchlistItem[];
  excludeIds?: number[];
}

interface BecauseYouLikedResult {
  sourceItem: WatchlistItem;
  recommendations: Content[];
}

interface GenreRecommendationsResult {
  genreName: string;
  genreId: number;
  recommendations: Content[];
  type: MediaType;
}

interface RecommendationsResponse {
  becauseYouLiked: BecauseYouLikedResult | null;
  topGenres: GenreRecommendationsResult[];
}

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Analyze genre preferences from watchlist items
 * Returns top genres sorted by frequency
 */
function analyzeGenrePreferences(
  items: WatchlistItem[]
): { genreId: number; count: number; type: MediaType }[] {
  const genreCounts: Record<string, { count: number; type: MediaType }> = {};

  items.forEach((item) => {
    const genres = item.genre_ids ?? [];
    genres.forEach((genreId) => {
      const key = `${genreId}-${item.media_type}`;
      if (!genreCounts[key]) {
        genreCounts[key] = { count: 0, type: item.media_type };
      }
      genreCounts[key].count++;
    });
  });

  return Object.entries(genreCounts)
    .map(([key, { count, type }]) => ({
      genreId: parseInt(key.split('-')[0]!, 10),
      count,
      type,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get similar content for a single item
 */
async function getSimilarContent(
  item: WatchlistItem,
  excludeIds: number[]
): Promise<Content[]> {
  if (item.media_type === 'movie') {
    const [similar, recommendations] = await Promise.all([
      getSimilarMovies(item.id).catch(() => ({ results: [] })),
      getMovieRecommendations(item.id).catch(() => ({ results: [] })),
    ]);

    const combined = [...(similar.results ?? []), ...(recommendations.results ?? [])];
    const uniqueMap = new Map<number, Content>();

    combined.forEach((m) => {
      if (!uniqueMap.has(m.id) && !excludeIds.includes(m.id)) {
        const movie = toMovie(m);
        uniqueMap.set(m.id, {
          ...movie,
          media_type: 'movie',
        });
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 12);
  } else {
    const [similar, recommendations] = await Promise.all([
      getSimilarTVShows(item.id).catch(() => ({ results: [] })),
      getTVShowRecommendations(item.id).catch(() => ({ results: [] })),
    ]);

    const combined = [...(similar.results ?? []), ...(recommendations.results ?? [])];
    const uniqueMap = new Map<number, Content>();

    combined.forEach((s) => {
      if (!uniqueMap.has(s.id) && !excludeIds.includes(s.id)) {
        const show = toTVShow(s);
        uniqueMap.set(s.id, {
          ...show,
          media_type: 'tv',
        });
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 12);
  }
}

/**
 * Get recommendations for a specific genre
 */
async function getGenreRecommendations(
  genreId: number,
  type: MediaType,
  excludeIds: number[]
): Promise<Content[]> {
  if (type === 'movie') {
    const response = await discoverMovies({
      with_genres: String(genreId),
      sort_by: 'popularity.desc',
      'vote_average.gte': 6.5,
      'vote_count.gte': 100,
    });

    return (response.results ?? [])
      .filter((m) => !excludeIds.includes(m.id))
      .slice(0, 12)
      .map((m) => {
        const movie = toMovie(m);
        return {
          ...movie,
          media_type: 'movie' as const,
        };
      });
  } else {
    const response = await discoverTVShows({
      with_genres: String(genreId),
      sort_by: 'popularity.desc',
      'vote_average.gte': 6.5,
      'vote_count.gte': 100,
    });

    return (response.results ?? [])
      .filter((s) => !excludeIds.includes(s.id))
      .slice(0, 12)
      .map((s) => {
        const show = toTVShow(s);
        return {
          ...show,
          media_type: 'tv' as const,
        };
      });
  }
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RecommendationsRequest;
    const { watchlistItems, excludeIds = [] } = body;

    if (!watchlistItems || watchlistItems.length === 0) {
      return NextResponse.json(
        { error: 'No watchlist items provided', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // All watchlist item IDs should be excluded
    const allExcludeIds = [...excludeIds, ...watchlistItems.map((item) => item.id)];

    // 1. "Because you liked X" - pick a random item with genre data
    let becauseYouLiked: BecauseYouLikedResult | null = null;

    // Prioritize items with genre_ids for better recommendations
    const itemsWithGenres = watchlistItems.filter(
      (item) => item.genre_ids && item.genre_ids.length > 0
    );
    const sourceItems = itemsWithGenres.length > 0 ? itemsWithGenres : watchlistItems;

    if (sourceItems.length > 0) {
      // Pick a random item, favoring recently added ones
      const recentItems = sourceItems.slice(0, Math.min(5, sourceItems.length));
      const randomIndex = Math.floor(Math.random() * recentItems.length);
      const sourceItem = recentItems[randomIndex]!;

      const recommendations = await getSimilarContent(sourceItem, allExcludeIds);

      if (recommendations.length > 0) {
        becauseYouLiked = {
          sourceItem,
          recommendations,
        };
      }
    }

    // 2. Top genres recommendations
    const topGenres: GenreRecommendationsResult[] = [];
    const genrePreferences = analyzeGenrePreferences(watchlistItems);

    // Get recommendations for top 2 genres
    for (const { genreId, type } of genrePreferences.slice(0, 2)) {
      // Get genre name
      const genreMap = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
      const genreName = genreMap[genreId];

      if (!genreName) continue;

      const recommendations = await getGenreRecommendations(genreId, type, allExcludeIds);

      if (recommendations.length > 0) {
        topGenres.push({
          genreName,
          genreId,
          recommendations,
          type,
        });
      }
    }

    const response: RecommendationsResponse = {
      becauseYouLiked,
      topGenres,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Recommendations API error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
