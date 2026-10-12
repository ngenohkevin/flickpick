// ==========================================================================
// New Movies API Route
// GET /api/new/movies - Fetch new movie releases with time period filters
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, type MovieSortBy } from '@/lib/tmdb/discover';
import { parseEnum, parseIdList, parsePage } from '@/lib/params';
import { TMDB_MAX_PAGE } from '@/lib/tmdb/genres';
import { providerTmdbIds } from '@/lib/constants';
import type { PaginatedResponse, Movie } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type TimePeriod = 'week' | 'month' | '3months' | 'year';
// 'title' is the browse dropdown's "Most Voted" option
type SortOption = 'date' | 'rating' | 'popularity' | 'title';
const SORT_OPTIONS: SortOption[] = ['date', 'rating', 'popularity', 'title'];
const PERIODS: TimePeriod[] = ['week', 'month', '3months', 'year'];

const RUNTIME_FILTERS: Record<string, { 'with_runtime.gte'?: number; 'with_runtime.lte'?: number }> = {
  short: { 'with_runtime.lte': 90 },
  medium: { 'with_runtime.gte': 90, 'with_runtime.lte': 150 },
  long: { 'with_runtime.gte': 150 },
};

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
    const periodParam = searchParams.get('period') ?? 'month';
    if (!PERIODS.includes(periodParam as TimePeriod)) {
      return NextResponse.json(
        { error: 'Invalid time period', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }
    const period = periodParam as TimePeriod;
    const page = parsePage(searchParams.get('page'));
    const genreIds = parseIdList(searchParams.get('genre'));
    const excludeGenreIds = parseIdList(searchParams.get('exclude_genre'));
    const ratingParam = parseFloat(searchParams.get('rating') ?? '');
    const ratingMin = ratingParam > 0 && ratingParam <= 10 ? ratingParam : undefined;
    const language = searchParams.get('language')?.match(/^[a-z]{2}$/)?.[0];
    const provider = searchParams.get('provider')?.match(/^\d+$/)?.[0];
    const providerIds = provider ? providerTmdbIds(provider).join('|') : undefined;
    const watchRegion = searchParams.get('watch_region')?.match(/^[A-Z]{2}$/)?.[0] ?? 'US';
    // The page sends 'release_date' as 'date'; accept both
    const sortRaw = searchParams.get('sort');
    const sortBy = parseEnum(sortRaw === 'release_date' ? 'date' : sortRaw, SORT_OPTIONS, 'date');
    const runtime = RUNTIME_FILTERS[searchParams.get('runtime') ?? ''] ?? {};

    // Pipe = OR (match ANY selected genre)
    const genres = genreIds.length > 0 ? genreIds.join('|') : undefined;
    const excludeGenres = excludeGenreIds.length > 0 ? excludeGenreIds.join('|') : undefined;

    // Calculate date range
    const { from, to } = getDateRange(period);
    const fromStr = formatDateForApi(from);
    const toStr = formatDateForApi(to);

    // Map sort option to TMDB sort parameter
    const sortMapping: Record<SortOption, MovieSortBy> = {
      date: 'primary_release_date.desc',
      rating: 'vote_average.desc',
      popularity: 'popularity.desc',
      title: 'vote_count.desc',
    };

    // Build discover params
    const response = await discoverMovies({
      page,
      sort_by: sortMapping[sortBy],
      'primary_release_date.gte': fromStr,
      'primary_release_date.lte': toStr,
      'vote_count.gte': sortBy === 'rating' ? 50 : 10, // Require more votes when sorting by rating
      ...(genres && { with_genres: genres }),
      ...(excludeGenres && { without_genres: excludeGenres }),
      ...(ratingMin && { 'vote_average.gte': ratingMin }),
      ...(language && { with_original_language: language }),
      ...(providerIds && { with_watch_providers: providerIds, watch_region: watchRegion }),
      ...runtime,
    });

    // Add media_type to results
    const results = (response.results ?? []).map((movie) => ({
      ...movie,
      media_type: 'movie' as const,
    }));

    const newMoviesResponse: NewMoviesResponse = {
      results: results as Movie[],
      page: response.page ?? 1,
      total_pages: Math.min(TMDB_MAX_PAGE, response.total_pages ?? 1),
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
