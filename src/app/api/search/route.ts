// ==========================================================================
// Search API Route
// Multi-search for movies, TV shows, and anime
// GET /api/search?q=query&type=multi&limit=10
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { searchContent, searchMovies, searchTVShows } from '@/lib/tmdb/search';
import { toMovie } from '@/lib/tmdb/movies';
import { toTVShow } from '@/lib/tmdb/tv';
import type { SearchResult, ApiError } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SearchResponse {
  results: SearchResult[];
  query: string;
  type: 'movie' | 'tv' | 'multi';
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = (searchParams.get('type') || 'multi') as 'movie' | 'tv' | 'multi';
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  // Validate query
  if (!query || query.trim().length === 0) {
    const error: ApiError = {
      error: 'Search query is required',
      code: 'INVALID_INPUT',
    };
    return NextResponse.json(error, { status: 400 });
  }

  // Validate limit
  if (isNaN(limit) || limit < 1 || limit > 50) {
    const error: ApiError = {
      error: 'Limit must be between 1 and 50',
      code: 'INVALID_INPUT',
    };
    return NextResponse.json(error, { status: 400 });
  }

  try {
    let results: SearchResult[] = [];

    if (type === 'multi') {
      // Multi-search (movies + TV)
      results = await searchContent(query.trim(), 1, limit);
    } else if (type === 'movie') {
      // Movie-only search
      const movieResponse = await searchMovies({ query: query.trim() });
      results = (movieResponse.results ?? []).slice(0, limit).map((movie) => {
        const fullMovie = toMovie(movie);
        return {
          id: fullMovie.id,
          title: fullMovie.title,
          media_type: 'movie' as const,
          poster_path: fullMovie.poster_path,
          release_date: fullMovie.release_date,
          vote_average: fullMovie.vote_average,
          content_type: getMovieContentType(movie),
        };
      });
    } else if (type === 'tv') {
      // TV-only search
      const tvResponse = await searchTVShows({ query: query.trim() });
      results = (tvResponse.results ?? []).slice(0, limit).map((show) => {
        const fullShow = toTVShow(show);
        return {
          id: fullShow.id,
          title: fullShow.name,
          media_type: 'tv' as const,
          poster_path: fullShow.poster_path,
          first_air_date: fullShow.first_air_date,
          vote_average: fullShow.vote_average,
          content_type: getTVContentType(show),
        };
      });
    }

    const response: SearchResponse = {
      results,
      query: query.trim(),
      type,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Search API error:', error);
    const apiError: ApiError = {
      error: 'Failed to search content',
      code: 'TMDB_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}

// ==========================================================================
// Helpers
// ==========================================================================

import type { TMDBMovie } from '@/lib/tmdb/movies';
import type { TMDBTVShow } from '@/lib/tmdb/tv';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import type { ContentType } from '@/types';

function getMovieContentType(movie: TMDBMovie): ContentType {
  const genreIds = movie.genre_ids ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = movie.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'movie';
}

function getTVContentType(show: TMDBTVShow): ContentType {
  const genreIds = show.genre_ids ?? [];
  const originCountry = show.origin_country ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = originCountry.includes('JP') || show.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'tv';
}
