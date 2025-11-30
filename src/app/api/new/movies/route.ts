// ==========================================================================
// New Movies API Route
// GET /api/new/movies - Fetch new movie releases with time period filters
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, type MovieSortBy } from '@/lib/tmdb/discover';
import type { PaginatedResponse, Movie } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type TimePeriod = 'week' | 'month' | '3months' | 'year';
type SortOption = 'date' | 'rating' | 'popularity';

interface NewMoviesResponse extends PaginatedResponse<Movie> {
  period: TimePeriod;
  date_range: {
    from: string;
    to: string;
  };
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function getDateRange(period: TimePeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = now;
  const from = new Date(now);

  switch (period) {
    case 'week':
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from.setDate(from.getDate() - 30);
      break;
    case '3months':
      from.setDate(from.getDate() - 90);
      break;
    case 'year':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return { from, to };
}

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const period = (searchParams.get('period') ?? 'month') as TimePeriod;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const genres = searchParams.get('genre') ?? undefined;
    const ratingMin = searchParams.get('rating') ?? undefined;
    const language = searchParams.get('language') ?? undefined;
    const provider = searchParams.get('provider') ?? undefined;
    const watchRegion = searchParams.get('watch_region') ?? 'US';
    const sortBy = (searchParams.get('sort') ?? 'date') as SortOption;

    // Validate period
    const validPeriods: TimePeriod[] = ['week', 'month', '3months', 'year'];
    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: 'Invalid time period', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Calculate date range
    const { from, to } = getDateRange(period);
    const fromStr = formatDateForApi(from);
    const toStr = formatDateForApi(to);

    // Map sort option to TMDB sort parameter
    const sortMapping: Record<SortOption, MovieSortBy> = {
      date: 'primary_release_date.desc',
      rating: 'vote_average.desc',
      popularity: 'popularity.desc',
    };

    // Build discover params
    const response = await discoverMovies({
      page,
      sort_by: sortMapping[sortBy],
      'primary_release_date.gte': fromStr,
      'primary_release_date.lte': toStr,
      'vote_count.gte': sortBy === 'rating' ? 50 : 10, // Require more votes when sorting by rating
      ...(genres && { with_genres: genres }),
      ...(ratingMin && { 'vote_average.gte': parseFloat(ratingMin) }),
      ...(language && { with_original_language: language }),
      ...(provider && { with_watch_providers: provider, watch_region: watchRegion }),
    });

    // Add media_type to results
    const results = (response.results ?? []).map((movie) => ({
      ...movie,
      media_type: 'movie' as const,
    }));

    const newMoviesResponse: NewMoviesResponse = {
      results: results as Movie[],
      page: response.page ?? 1,
      total_pages: response.total_pages ?? 1,
      total_results: response.total_results ?? 0,
      period,
      date_range: {
        from: fromStr,
        to: toStr,
      },
    };

    return NextResponse.json(newMoviesResponse);
  } catch (error) {
    console.error('New Movies API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch new movies',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
