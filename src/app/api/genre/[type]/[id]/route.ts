// ==========================================================================
// Genre API Route
// GET /api/genre/[type]/[id] - Browse content by genre
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { MOVIE_GENRES, TV_GENRES, GENRE_SLUGS } from '@/lib/constants';
import type { PaginatedResponse, Content, Genre } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface GenreParams {
  type: string;
  id: string;
}

interface GenreResponse extends PaginatedResponse<Content> {
  genre: Genre;
  type: 'movie' | 'tv';
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<GenreParams> }
) {
  try {
    const { type, id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Validate type
    if (type !== 'movie' && type !== 'tv') {
      return NextResponse.json(
        { error: 'Invalid type. Must be "movie" or "tv"', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Parse genre ID - can be numeric ID or slug
    let genreId: number;
    if (/^\d+$/.test(id)) {
      genreId = parseInt(id, 10);
    } else {
      // Try to convert slug to ID
      const slugId = GENRE_SLUGS[id.toLowerCase()];
      if (!slugId) {
        return NextResponse.json(
          { error: 'Invalid genre', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }
      genreId = slugId;
    }

    // Get genre name
    const genreList = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
    const genreName = genreList[genreId];

    if (!genreName) {
      return NextResponse.json(
        { error: 'Genre not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const sortBy = searchParams.get('sort_by') ?? 'popularity';
    const yearFrom = searchParams.get('year_from') ?? undefined;
    const yearTo = searchParams.get('year_to') ?? undefined;
    const ratingMin = searchParams.get('rating_min') ?? undefined;

    // Build sort parameter
    const sortMapping = {
      popularity: type === 'movie' ? 'popularity.desc' : 'popularity.desc',
      rating: type === 'movie' ? 'vote_average.desc' : 'vote_average.desc',
      release_date: type === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc',
    } as const;

    const sort = sortMapping[sortBy as keyof typeof sortMapping] ?? sortMapping.popularity;

    // Fetch content
    let response;

    if (type === 'movie') {
      response = await discoverMovies({
        page,
        with_genres: String(genreId),
        sort_by: sort as 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc',
        ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
        ...(ratingMin && { 'vote_average.gte': parseFloat(ratingMin), 'vote_count.gte': 50 }),
      });
    } else {
      response = await discoverTVShows({
        page,
        with_genres: String(genreId),
        sort_by: sort as 'popularity.desc' | 'vote_average.desc' | 'first_air_date.desc',
        ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
        ...(ratingMin && { 'vote_average.gte': parseFloat(ratingMin), 'vote_count.gte': 50 }),
      });
    }

    // Add media_type to results
    const results = (response.results ?? []).map((item) => ({
      ...item,
      media_type: type,
    }));

    const genreResponse: GenreResponse = {
      genre: { id: genreId, name: genreName },
      type,
      results: results as Content[],
      page: response.page ?? 1,
      total_pages: response.total_pages ?? 1,
      total_results: response.total_results ?? 0,
    };

    return NextResponse.json(genreResponse);
  } catch (error) {
    console.error('Genre API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch genre content',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
