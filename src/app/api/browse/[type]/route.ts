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
import type { ContentType, PaginatedResponse, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface BrowseParams {
  type: string;
}

type SortOption = 'popularity' | 'rating' | 'release_date' | 'title';

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
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const genres = searchParams.get('genre') ?? undefined; // comma-separated genre IDs
    const yearFrom = searchParams.get('year_from') ?? undefined;
    const yearTo = searchParams.get('year_to') ?? undefined;
    const ratingMin = searchParams.get('rating_min') ?? undefined;
    const provider = searchParams.get('provider') ?? undefined;
    const watchRegion = searchParams.get('watch_region') ?? 'US';
    const sortBy = (searchParams.get('sort_by') ?? 'popularity') as SortOption;

    // Build sort parameter based on type
    const sortMapping: Record<SortOption, { movie: MovieSortBy; tv: TVSortBy }> = {
      popularity: { movie: 'popularity.desc', tv: 'popularity.desc' },
      rating: { movie: 'vote_average.desc', tv: 'vote_average.desc' },
      release_date: { movie: 'primary_release_date.desc', tv: 'first_air_date.desc' },
      title: { movie: 'vote_count.desc', tv: 'vote_count.desc' }, // TMDB doesn't have title sort, use vote_count as proxy
    };

    // Determine if we're dealing with movies or TV
    const isMovieType = contentType === 'movie' || contentType === 'animation' || contentType === 'anime';

    // Build common filter params
    // Note: For animation/anime, genres are passed separately to combine with animation genre
    const baseParams = {
      page,
      ...(ratingMin && { 'vote_average.gte': parseFloat(ratingMin) }),
      ...(ratingMin && { 'vote_count.gte': 50 }), // Require minimum votes when filtering by rating
      ...(provider && { with_watch_providers: provider, watch_region: watchRegion }),
    };

    // For movie/tv types, include genres in baseParams
    const baseParamsWithGenres = {
      ...baseParams,
      ...(genres && { with_genres: genres }),
    };

    let response;

    if (contentType === 'movie') {
      response = await discoverMovies({
        ...baseParamsWithGenres,
        sort_by: sortMapping[sortBy].movie,
        ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
      });
    } else if (contentType === 'tv') {
      response = await discoverTVShows({
        ...baseParamsWithGenres,
        sort_by: sortMapping[sortBy].tv,
        ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
      });
    } else if (contentType === 'animation') {
      // Animation: Split between movies and TV, then merge
      // Pass user-selected genres as second parameter to combine with animation genre
      if (isMovieType) {
        const [movieResponse, tvResponse] = await Promise.all([
          discoverAnimationMovies(
            {
              ...baseParams,
              sort_by: sortMapping[sortBy].movie,
              ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
              ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
            },
            genres
          ),
          discoverAnimationTVShows(
            {
              ...baseParams,
              sort_by: sortMapping[sortBy].tv,
              ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
              ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
            },
            genres
          ),
        ]);

        // Merge and sort results
        const mergedResults = [
          ...(movieResponse.results ?? []).map((m) => ({ ...m, media_type: 'movie' as const })),
          ...(tvResponse.results ?? []).map((t) => ({ ...t, media_type: 'tv' as const })),
        ].sort((a, b) => {
          if (sortBy === 'rating') return (b.vote_average ?? 0) - (a.vote_average ?? 0);
          if (sortBy === 'release_date') {
            const dateA = 'release_date' in a ? a.release_date : 'first_air_date' in a ? a.first_air_date : '';
            const dateB = 'release_date' in b ? b.release_date : 'first_air_date' in b ? b.first_air_date : '';
            return new Date(dateB ?? '').getTime() - new Date(dateA ?? '').getTime();
          }
          return (b.popularity ?? 0) - (a.popularity ?? 0);
        });

        response = {
          page,
          results: mergedResults.slice(0, 20),
          total_pages: Math.max(movieResponse.total_pages ?? 1, tvResponse.total_pages ?? 1),
          total_results: (movieResponse.total_results ?? 0) + (tvResponse.total_results ?? 0),
        };
      }
    } else if (contentType === 'anime') {
      // Anime: Same approach - merge movies and TV
      // Pass user-selected genres as second parameter to combine with animation genre
      const [movieResponse, tvResponse] = await Promise.all([
        discoverAnimeMovies(
          {
            ...baseParams,
            sort_by: sortMapping[sortBy].movie,
            ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
            ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
          },
          genres
        ),
        discoverAnimeTVShows(
          {
            ...baseParams,
            sort_by: sortMapping[sortBy].tv,
            ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
            ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
          },
          genres
        ),
      ]);

      // Merge and sort results
      const mergedResults = [
        ...(movieResponse.results ?? []).map((m) => ({ ...m, media_type: 'movie' as const })),
        ...(tvResponse.results ?? []).map((t) => ({ ...t, media_type: 'tv' as const })),
      ].sort((a, b) => {
        if (sortBy === 'rating') return (b.vote_average ?? 0) - (a.vote_average ?? 0);
        if (sortBy === 'release_date') {
          const dateA = 'release_date' in a ? a.release_date : 'first_air_date' in a ? a.first_air_date : '';
          const dateB = 'release_date' in b ? b.release_date : 'first_air_date' in b ? b.first_air_date : '';
          return new Date(dateB ?? '').getTime() - new Date(dateA ?? '').getTime();
        }
        return (b.popularity ?? 0) - (a.popularity ?? 0);
      });

      response = {
        page,
        results: mergedResults.slice(0, 20),
        total_pages: Math.max(movieResponse.total_pages ?? 1, tvResponse.total_pages ?? 1),
        total_results: (movieResponse.total_results ?? 0) + (tvResponse.total_results ?? 0),
      };
    }

    if (!response) {
      return NextResponse.json(
        { error: 'Failed to fetch content', code: 'TMDB_ERROR' },
        { status: 500 }
      );
    }

    // Add media_type to results if not present (for movie/tv types)
    const results = (response.results ?? []).map((item) => ({
      ...item,
      media_type: 'media_type' in item ? item.media_type : contentType === 'tv' ? 'tv' : 'movie',
    }));

    const browseResponse: PaginatedResponse<Content> = {
      results: results as Content[],
      page: response.page ?? 1,
      total_pages: response.total_pages ?? 1,
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
