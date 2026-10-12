// ==========================================================================
// Genre API Route
// GET /api/genre/[type]/[id] - Browse content by genre
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { MOVIE_GENRES, TV_GENRES, GENRE_SLUGS, RATING_SORT_MIN_VOTES } from '@/lib/constants';
import { parseEnum, parsePage } from '@/lib/params';
import { TMDB_MAX_PAGE } from '@/lib/tmdb/genres';
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

const SORT_OPTIONS = ['popularity', 'rating', 'release_date', 'title'] as const;

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
    const page = parsePage(searchParams.get('page'));
    const sortBy = parseEnum(searchParams.get('sort_by'), SORT_OPTIONS, 'popularity');
    const yearFrom = searchParams.get('year_from')?.match(/^\d{4}$/)?.[0];
    const yearTo = searchParams.get('year_to')?.match(/^\d{4}$/)?.[0];
    const ratingParam = parseFloat(searchParams.get('rating_min') ?? '');
    const ratingMin = ratingParam > 0 && ratingParam <= 10 ? ratingParam : undefined;

    // A rating filter needs 50 votes; a rating sort needs more, or the list
    // opens with obscure titles rated 10 by a single voter.
    const minVotes = Math.max(ratingMin ? 50 : 0, sortBy === 'rating' ? RATING_SORT_MIN_VOTES : 0);
    const common = {
      page,
      with_genres: String(genreId),
      ...(ratingMin && { 'vote_average.gte': ratingMin }),
      ...(minVotes > 0 && { 'vote_count.gte': minVotes }),
    };

    // Fetch content
    let response;

    if (type === 'movie') {
      const movieSort = {
        popularity: 'popularity.desc',
        rating: 'vote_average.desc',
        release_date: 'primary_release_date.desc',
        title: 'vote_count.desc', // the dropdown's "Most Voted"
      } as const;
      response = await discoverMovies({
        ...common,
        sort_by: movieSort[sortBy],
        ...(yearFrom && { 'primary_release_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'primary_release_date.lte': `${yearTo}-12-31` }),
      });
    } else {
      const tvSort = {
        popularity: 'popularity.desc',
        rating: 'vote_average.desc',
        release_date: 'first_air_date.desc',
        title: 'vote_count.desc',
      } as const;
      response = await discoverTVShows({
        ...common,
        sort_by: tvSort[sortBy],
        ...(yearFrom && { 'first_air_date.gte': `${yearFrom}-01-01` }),
        ...(yearTo && { 'first_air_date.lte': `${yearTo}-12-31` }),
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
      total_pages: Math.min(TMDB_MAX_PAGE, response.total_pages ?? 1),
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
