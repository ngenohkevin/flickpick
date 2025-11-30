// ==========================================================================
// Category API Route
// GET /api/category/[slug] - Browse content by curated category
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { type TMDBResponse } from '@/lib/tmdb/client';
import {
  discoverMovies,
  discoverTVShows,
  getHiddenGems,
  getTopRated,
  getClassics,
  getFamilyFriendly,
  getInternational,
} from '@/lib/tmdb/discover';
import { getTrendingMovies, type TMDBMovie } from '@/lib/tmdb/movies';
import { getTrendingTVShows, type TMDBTVShow } from '@/lib/tmdb/tv';
import { CURATED_CATEGORIES } from '@/lib/constants';
import type { PaginatedResponse, Content, Category } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface CategoryParams {
  slug: string;
}

interface CategoryResponse extends PaginatedResponse<Content> {
  category: Category;
}

// ==========================================================================
// Category Fetchers
// ==========================================================================

type CategoryFetcher = (
  page: number,
  type: 'movie' | 'tv' | 'all'
) => Promise<TMDBResponse<TMDBMovie | TMDBTVShow>>;

const categoryFetchers: Record<string, CategoryFetcher> = {
  trending: async (page, type) => {
    if (type === 'movie') {
      return getTrendingMovies('week');
    } else if (type === 'tv') {
      return getTrendingTVShows('week');
    }
    // Merge both for 'all'
    const [movies, tv] = await Promise.all([
      getTrendingMovies('week'),
      getTrendingTVShows('week'),
    ]);
    return mergeResults(movies, tv, page);
  },

  'new-releases': async (page, type) => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    if (type === 'movie' || type === 'all') {
      return discoverMovies({
        page,
        sort_by: 'primary_release_date.desc',
        'primary_release_date.lte': today.toISOString().split('T')[0],
        'primary_release_date.gte': thirtyDaysAgo.toISOString().split('T')[0],
        'vote_count.gte': 10,
      });
    }
    // TV new releases
    return discoverTVShows({
      page,
      sort_by: 'first_air_date.desc',
      'first_air_date.lte': today.toISOString().split('T')[0],
      'first_air_date.gte': thirtyDaysAgo.toISOString().split('T')[0],
      'vote_count.gte': 10,
    });
  },

  'top-rated': async (page, type) => {
    if (type === 'tv') {
      return getTopRated('tv', page) as Promise<TMDBResponse<TMDBTVShow>>;
    }
    if (type === 'movie') {
      return getTopRated('movie', page) as Promise<TMDBResponse<TMDBMovie>>;
    }
    // Merge both
    const [movies, tv] = await Promise.all([
      getTopRated('movie', page),
      getTopRated('tv', page),
    ]);
    return mergeResults(
      movies as TMDBResponse<TMDBMovie>,
      tv as TMDBResponse<TMDBTVShow>,
      page
    );
  },

  'hidden-gems': async (page, type) => {
    if (type === 'tv') {
      return getHiddenGems('tv', page) as Promise<TMDBResponse<TMDBTVShow>>;
    }
    if (type === 'movie') {
      return getHiddenGems('movie', page) as Promise<TMDBResponse<TMDBMovie>>;
    }
    // Merge both
    const [movies, tv] = await Promise.all([
      getHiddenGems('movie', page),
      getHiddenGems('tv', page),
    ]);
    return mergeResults(
      movies as TMDBResponse<TMDBMovie>,
      tv as TMDBResponse<TMDBTVShow>,
      page
    );
  },

  'award-winners': async (page, type) => {
    // Use keywords for Oscar/Emmy winners - this is approximate
    // TMDB keyword IDs for awards: 270 (oscar winner), 271 (oscar nominee)
    if (type === 'movie' || type === 'all') {
      return discoverMovies({
        page,
        sort_by: 'vote_average.desc',
        'vote_average.gte': 7.5,
        'vote_count.gte': 1000,
        with_keywords: '270|271', // Oscar related
      });
    }
    return discoverTVShows({
      page,
      sort_by: 'vote_average.desc',
      'vote_average.gte': 8,
      'vote_count.gte': 500,
    });
  },

  classics: async (page, _type) => {
    return getClassics(page);
  },

  'family-friendly': async (page, type) => {
    if (type === 'tv') {
      return getFamilyFriendly('tv', page) as Promise<TMDBResponse<TMDBTVShow>>;
    }
    if (type === 'movie') {
      return getFamilyFriendly('movie', page) as Promise<TMDBResponse<TMDBMovie>>;
    }
    // Merge both
    const [movies, tv] = await Promise.all([
      getFamilyFriendly('movie', page),
      getFamilyFriendly('tv', page),
    ]);
    return mergeResults(
      movies as TMDBResponse<TMDBMovie>,
      tv as TMDBResponse<TMDBTVShow>,
      page
    );
  },

  international: async (page, type) => {
    if (type === 'tv') {
      return getInternational('tv', page) as Promise<TMDBResponse<TMDBTVShow>>;
    }
    if (type === 'movie') {
      return getInternational('movie', page) as Promise<TMDBResponse<TMDBMovie>>;
    }
    // Merge both
    const [movies, tv] = await Promise.all([
      getInternational('movie', page),
      getInternational('tv', page),
    ]);
    return mergeResults(
      movies as TMDBResponse<TMDBMovie>,
      tv as TMDBResponse<TMDBTVShow>,
      page
    );
  },
};

// ==========================================================================
// Helper Functions
// ==========================================================================

function mergeResults(
  movies: TMDBResponse<TMDBMovie>,
  tv: TMDBResponse<TMDBTVShow>,
  page: number
): TMDBResponse<TMDBMovie | TMDBTVShow> {
  const movieResults = (movies.results ?? []).map((m) => ({
    ...m,
    media_type: 'movie' as const,
  }));
  const tvResults = (tv.results ?? []).map((t) => ({
    ...t,
    media_type: 'tv' as const,
  }));

  // Interleave and sort by popularity
  const merged = [...movieResults, ...tvResults].sort(
    (a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)
  );

  return {
    page,
    results: merged.slice(0, 20),
    total_pages: Math.max(movies.total_pages ?? 1, tv.total_pages ?? 1),
    total_results: (movies.total_results ?? 0) + (tv.total_results ?? 0),
  };
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<CategoryParams> }
) {
  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Find category
    const category = CURATED_CATEGORIES.find((c) => c.slug === slug);
    if (!category) {
      return NextResponse.json(
        { error: 'Category not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get fetcher for this category
    const fetcher = categoryFetchers[slug];
    if (!fetcher) {
      return NextResponse.json(
        { error: 'Category not implemented', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const type = (searchParams.get('type') ?? 'all') as 'movie' | 'tv' | 'all';

    // Fetch content
    const response = await fetcher(page, type);

    // Add media_type to results if not present
    const results = (response.results ?? []).map((item) => {
      if ('media_type' in item) return item;
      // Determine type from properties
      const isTV = 'first_air_date' in item || 'name' in item;
      return {
        ...item,
        media_type: isTV ? 'tv' : 'movie',
      };
    });

    const categoryResponse: CategoryResponse = {
      category,
      results: results as Content[],
      page: response.page ?? 1,
      total_pages: response.total_pages ?? 1,
      total_results: response.total_results ?? 0,
    };

    return NextResponse.json(categoryResponse);
  } catch (error) {
    console.error('Category API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch category content',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
