// ==========================================================================
// Movie Details API Route
// GET /api/movie/[id]
// Returns movie details with credits, videos, providers, and similar movies
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieDetailsExtended,
  getRelatedMovies,
  type TMDBMovie,
} from '@/lib/tmdb/movies';
import { getCached, cacheKeys } from '@/lib/redis';
import { CACHE_TTL, ANIMATION_GENRE_ID } from '@/lib/constants';
import type { ApiError, ContentType, Credits, Video, ProvidersByCountry } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface Keyword {
  id: number;
  name: string;
}

interface MovieResponse {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: { id: number; name: string }[];
  keywords: Keyword[];
  credits: Credits;
  videos: Video[];
  providers: ProvidersByCountry;
  content_type: ContentType;
  budget: number | null;
  revenue: number | null;
  status: string | null;
  imdb_id: string | null;
  homepage: string | null;
  similar: Array<{
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    vote_average: number;
    content_type: ContentType;
  }>;
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  // Validate movie ID
  if (isNaN(movieId) || movieId <= 0) {
    const error: ApiError = {
      error: 'Invalid movie ID',
      code: 'INVALID_INPUT',
    };
    return NextResponse.json(error, { status: 400 });
  }

  try {
    // Use Redis cache for movie details
    const response = await getCached<MovieResponse>(
      cacheKeys.movie(movieId),
      async () => {
        // Fetch movie details and related movies in parallel
        const [movieData, relatedMovies] = await Promise.all([
          getMovieDetailsExtended(movieId),
          getRelatedMovies(movieId),
        ]);

        // Determine content type
        const contentType = getMovieContentType(movieData);

        // Format similar movies
        const similar = relatedMovies.slice(0, 12).map((movie) => ({
          id: movie.id,
          title: movie.title,
          poster_path: movie.poster_path,
          release_date: movie.release_date,
          vote_average: movie.vote_average,
          content_type: getMovieContentType(movie),
        }));

        return {
          id: movieData.id,
          title: movieData.title,
          original_title: movieData.original_title,
          overview: movieData.overview,
          tagline: movieData.tagline ?? null,
          poster_path: movieData.poster_path,
          backdrop_path: movieData.backdrop_path,
          release_date: movieData.release_date,
          runtime: movieData.runtime ?? null,
          vote_average: movieData.vote_average,
          vote_count: movieData.vote_count,
          popularity: movieData.popularity,
          genres: movieData.genres ?? [],
          keywords: movieData.keywords ?? [],
          credits: movieData.credits,
          videos: movieData.videos ?? [],
          providers: movieData.providers ?? {},
          content_type: contentType,
          budget: movieData.budget ?? null,
          revenue: movieData.revenue ?? null,
          status: movieData.status ?? null,
          imdb_id: movieData.imdb_id ?? null,
          homepage: movieData.homepage ?? null,
          similar,
        };
      },
      CACHE_TTL.MOVIE_DETAILS
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Movie API error:', error);

    // Check if it's a 404 from TMDB
    if (error instanceof Error && error.message.includes('404')) {
      const apiError: ApiError = {
        error: 'Movie not found',
        code: 'NOT_FOUND',
      };
      return NextResponse.json(apiError, { status: 404 });
    }

    const apiError: ApiError = {
      error: 'Failed to fetch movie details',
      code: 'TMDB_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}

// ==========================================================================
// Helpers
// ==========================================================================

function getMovieContentType(movie: TMDBMovie): ContentType {
  const genreIds = movie.genre_ids ?? movie.genres?.map((g) => g.id) ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = movie.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'movie';
}
