// ==========================================================================
// Browse API Route
// GET /api/browse/[type] - Browse movies, TV shows, animation, or anime
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  discoverMovies,
  discoverTVShows,
  discoverAnimationMovies,
  discoverAnimationTVShows,
  discoverAnimeMovies,
  discoverAnimeTVShows,
  type MovieSortBy,
  type TVSortBy,
} from '@/lib/tmdb/discover';
import type { TMDBResponse } from '@/lib/tmdb/client';
import type { TMDBMovie } from '@/lib/tmdb/movies';
import type { TMDBTVShow } from '@/lib/tmdb/tv';
import { TMDB_MAX_PAGE, toTVGenres } from '@/lib/tmdb/genres';
import { parseEnum, parseIdList, parsePage } from '@/lib/params';
import { RATING_SORT_MIN_VOTES, providerTmdbIds } from '@/lib/constants';
import type { ContentType, PaginatedResponse, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface BrowseParams {
  type: string;
}

type SortOption = 'popularity' | 'rating' | 'release_date' | 'title';
const SORT_OPTIONS: SortOption[] = ['popularity', 'rating', 'release_date', 'title'];
const RUNTIMES = ['any', 'short', 'medium', 'long'] as const;


/** Year bounds in ascending order (either may be missing). */
function orderedYears(from?: string, to?: string): [string | undefined, string | undefined] {
  return from && to && from > to ? [to, from] : [from, to];
}

/**
 * Merges one movie page and one TV page into a single page.
 *
 * Both halves are kept. Trimming the merged list to 20 dropped the other 20
 * for good, since page N+1 fetches the next movie and TV pages.
 */
function mergeMoviesAndTV(
  movies: TMDBResponse<TMDBMovie>,
  tv: TMDBResponse<TMDBTVShow>,
  sortBy: SortOption,
  page: number
) {
  const dateOf = (item: { release_date?: string; first_air_date?: string }) =>
    new Date(item.release_date ?? item.first_air_date ?? '').getTime() || 0;

  const results = [
    ...(movies.results ?? []).map((m) => ({ ...m, media_type: 'movie' as const })),
    ...(tv.results ?? []).map((t) => ({ ...t, media_type: 'tv' as const })),
  ].sort((a, b) => {
    if (sortBy === 'rating') return (b.vote_average ?? 0) - (a.vote_average ?? 0);
    if (sortBy === 'release_date') return dateOf(b) - dateOf(a);
    if (sortBy === 'title') return (b.vote_count ?? 0) - (a.vote_count ?? 0);
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  return {
    page,
    results,
    total_pages: Math.min(TMDB_MAX_PAGE, Math.max(movies.total_pages ?? 0, tv.total_pages ?? 0)),
    total_results: (movies.total_results ?? 0) + (tv.total_results ?? 0),
  };
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<BrowseParams> }
) {
  try {
    const { type } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Validate content type
    const validTypes: ContentType[] = ['movie', 'tv', 'animation', 'anime'];
    // Map URL types to internal types
    const typeMapping: Record<string, ContentType> = {
      movies: 'movie',
      movie: 'movie',
      tv: 'tv',
      animation: 'animation',
      anime: 'anime',
    };

    const contentType = typeMapping[type];
    if (!contentType || !validTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const page = parsePage(searchParams.get('page'));
    const genreIds = parseIdList(searchParams.get('genre'));
    const excludeGenreIds = parseIdList(searchParams.get('exclude_genre'));
    // An inverted range (2020 → 2010) is read as 2010 → 2020, not as "nothing"
    const [yearFrom, yearTo] = orderedYears(
      searchParams.get('year_from')?.match(/^\d{4}$/)?.[0],
      searchParams.get('year_to')?.match(/^\d{4}$/)?.[0]
    );
    const ratingParam = parseFloat(searchParams.get('rating_min') ?? '');
    const ratingMin = ratingParam > 0 && ratingParam <= 10 ? ratingParam : undefined;
    const language = searchParams.get('language')?.match(/^[a-z]{2}$/)?.[0]; // ISO 639-1 language code
    const provider = searchParams.get('provider')?.match(/^\d+$/)?.[0];
    // All tiers of the service (e.g. Paramount+ Premium | Essential)
    const providerIds = provider ? providerTmdbIds(provider).join('|') : undefined;
    const watchRegion = searchParams.get('watch_region')?.match(/^[A-Z]{2}$/)?.[0] ?? 'US';
    const sortBy = parseEnum(searchParams.get('sort_by'), SORT_OPTIONS, 'popularity');
    const runtime = parseEnum(searchParams.get('runtime'), RUNTIMES, 'any');

    // Comma = AND (must match ALL), Pipe = OR (match ANY) — OR is the expected UX
    const genres = genreIds.length > 0 ? genreIds.join('|') : undefined;
    const excludeGenres = excludeGenreIds.length > 0 ? excludeGenreIds.join('|') : undefined;
    const tvExcludeGenres = excludeGenreIds.length > 0 ? toTVGenres(excludeGenreIds).join('|') || undefined : undefined;

    // Runtime filter mapping (in minutes)
    const runtimeFilters: Record<string, { gte?: number; lte?: number }> = {
      short: { lte: 90 },
      medium: { gte: 90, lte: 150 },
      long: { gte: 150 },
    };

    // Build sort parameter based on type
    const sortMapping: Record<SortOption, { movie: MovieSortBy; tv: TVSortBy }> = {
      popularity: { movie: 'popularity.desc', tv: 'popularity.desc' },
      rating: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
      release_date: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
      title: { movie: 'vote_count.desc', tv: 'vote_count.desc' }, // TMDB doesn't have title sort, use vote_count as proxy
    };

    // Get runtime filter values if specified
    const runtimeFilter = runtimeFilters[runtime] ?? null;

    // Build common filter params
    // Vote floor: a rating filter needs 50 votes; sorting by rating needs more,
    // or the top of the list is obscure titles rated 10 by a single voter.
    const minVotes = Math.max(ratingMin ? 50 : 0, sortBy === 'rating' ? RATING_SORT_MIN_VOTES : 0);
    const baseParams = {
      page,
      ...(ratingMin && { 'vote_average.gte': ratingMin }),
      ...(minVotes > 0 && { 'vote_count.gte': minVotes }),
      ...(language && { with_original_language: language }),
      ...(providerIds && { with_watch_providers: providerIds, watch_region: watchRegion }),
    };
    // Genre IDs as sent (movie IDs on movie/animation/anime pages, TV IDs on the TV page)
    const unmappedBase = { ...baseParams, ...(excludeGenres && { without_genres: excludeGenres }) };
    // Animation/anime TV half: the sidebar listed movie genres, so map them
    const mappedTVBase = { ...baseParams, ...(tvExcludeGenres && { without_genres: tvExcludeGenres }) };

    // Film runtime; on /discover/tv the same params filter on episode runtime,
    // so "Long" on the animation/anime pages leaves the films (and a handful
    // of feature-length specials) instead of ignoring the series half.
    const runtimeParams = runtimeFilter
      ? {
          ...(runtimeFilter.gte && { 'with_runtime.gte': runtimeFilter.gte }),
          ...(runtimeFilter.lte && { 'with_runtime.lte': runtimeFilter.lte }),
        }
      : {};

    const movieDates = {
      ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
      ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
    };
    const tvDates = {
      ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
      ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
    };

    let response;

    if (contentType === 'movie') {
      response = await discoverMovies({
        ...unmappedBase,
        ...runtimeParams,
        ...movieDates,
        ...(genres && { with_genres: genres }),
        sort_by: sortMapping[sortBy].movie,
      });
    } else if (contentType === 'tv') {
      // The TV page's sidebar lists TV genres, so IDs pass through unchanged
      response = await discoverTVShows({
        ...unmappedBase,
        ...tvDates,
        ...(genres && { with_genres: genres }),
        sort_by: sortMapping[sortBy].tv,
      });
    } else {
      // Animation/anime: one movie page + one TV page, merged. The sidebar
      // lists movie genres; the TV query maps them to TV genre IDs.
      const discoverMovie = contentType === 'animation' ? discoverAnimationMovies : discoverAnimeMovies;
      const discoverTV = contentType === 'animation' ? discoverAnimationTVShows : discoverAnimeTVShows;

      const [movieResponse, tvResponse] = await Promise.all([
        discoverMovie(
          { ...unmappedBase, ...runtimeParams, ...movieDates, sort_by: sortMapping[sortBy].movie },
          genreIds
        ),
        discoverTV({ ...mappedTVBase, ...runtimeParams, ...tvDates, sort_by: sortMapping[sortBy].tv }, genreIds),
      ]);

      response = mergeMoviesAndTV(movieResponse, tvResponse, sortBy, page);
    }

    // Add media_type to results if not present (for movie/tv types)
    const results = (response.results ?? []).map((item) => ({
      ...item,
      media_type: 'media_type' in item ? item.media_type : contentType === 'tv' ? 'tv' : 'movie',
    }));

    const browseResponse: PaginatedResponse<Content> = {
      results: results as Content[],
      page: response.page ?? 1,
      total_pages: Math.min(TMDB_MAX_PAGE, response.total_pages ?? 1),
      total_results: response.total_results ?? 0,
    };

    return NextResponse.json(browseResponse);
  } catch (error) {
    console.error('Browse API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch content',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
