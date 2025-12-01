// ==========================================================================
// Similar Content API Route
// GET /api/similar/[type]/[id] - Fetch similar movies or TV shows
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetailsExtended, getRelatedMovies, toMovie } from '@/lib/tmdb/movies';
import { getTVShowDetailsExtended, getRelatedTVShows, toTVShow } from '@/lib/tmdb/tv';
import { getContentType } from '@/lib/utils';
import type { Movie, TVShow, ContentType, Genre } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type ContentMediaType = 'movie' | 'tv';

interface SimilarContentResponse {
  source: {
    id: number;
    title: string;
    overview: string;
    tagline?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
    runtime?: number;
    genres: Genre[];
    content_type: ContentType;
    media_type: ContentMediaType;
    // For TV
    number_of_seasons?: number;
    number_of_episodes?: number;
    status?: string;
  };
  similar: Array<Movie | TVShow>;
  traits: string[];
  related_genres: Genre[];
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function extractTraits(
  content: {
    genres?: Genre[];
    vote_average: number;
    vote_count: number;
    tagline?: string;
    overview: string;
    popularity: number;
  },
  mediaType: ContentMediaType
): string[] {
  const traits: string[] = [];
  const genres = content.genres ?? [];

  // High rating trait
  if (content.vote_average >= 8 && content.vote_count >= 1000) {
    traits.push('Critically acclaimed with outstanding ratings');
  } else if (content.vote_average >= 7.5) {
    traits.push('Highly rated by audiences');
  }

  // Genre-based traits
  const genreNames = genres.map((g) => g.name.toLowerCase());

  if (genreNames.includes('action') && genreNames.includes('adventure')) {
    traits.push('Thrilling action-packed adventure');
  } else if (genreNames.includes('action')) {
    traits.push('Exciting action sequences');
  }

  if (genreNames.includes('comedy')) {
    traits.push('Entertaining and funny moments');
  }

  if (genreNames.includes('drama')) {
    traits.push('Compelling dramatic storytelling');
  }

  if (genreNames.includes('science fiction') || genreNames.includes('sci-fi & fantasy')) {
    traits.push('Imaginative sci-fi concepts');
  }

  if (genreNames.includes('horror') || genreNames.includes('thriller')) {
    traits.push('Edge-of-your-seat suspense');
  }

  if (genreNames.includes('romance')) {
    traits.push('Heartfelt romantic storyline');
  }

  if (genreNames.includes('animation')) {
    traits.push('Stunning visual animation');
  }

  if (genreNames.includes('mystery')) {
    traits.push('Intriguing mystery elements');
  }

  if (genreNames.includes('documentary')) {
    traits.push('Thought-provoking documentary');
  }

  // Popularity trait
  if (content.popularity > 100) {
    traits.push('Widely popular and talked about');
  }

  // Ensure we have at least 3 traits
  if (traits.length < 3) {
    if (mediaType === 'movie') {
      traits.push('Memorable cinematic experience');
    } else {
      traits.push('Engaging episodic storytelling');
    }
  }

  // Return top 3 unique traits
  return [...new Set(traits)].slice(0, 3);
}

function isValidMediaType(type: string): type is ContentMediaType {
  return type === 'movie' || type === 'tv';
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;

    // Validate type
    if (!isValidMediaType(type)) {
      return NextResponse.json(
        { error: 'Invalid content type. Use "movie" or "tv"', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Validate ID
    const contentId = parseInt(id, 10);
    if (isNaN(contentId) || contentId <= 0) {
      return NextResponse.json(
        { error: 'Invalid content ID', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    let response: SimilarContentResponse;

    if (type === 'movie') {
      // Fetch movie details and related content
      const [details, related] = await Promise.all([
        getMovieDetailsExtended(contentId),
        getRelatedMovies(contentId),
      ]);

      const contentType = getContentType({
        ...details,
        media_type: 'movie',
      } as Movie);

      // Convert related movies
      const similarMovies = related.map((m) => ({
        ...toMovie(m),
        media_type: 'movie' as const,
      }));

      response = {
        source: {
          id: details.id,
          title: details.title,
          overview: details.overview,
          tagline: details.tagline,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          release_date: details.release_date,
          vote_average: details.vote_average,
          vote_count: details.vote_count,
          runtime: details.runtime,
          genres: details.genres ?? [],
          content_type: contentType,
          media_type: 'movie',
        },
        similar: similarMovies,
        traits: extractTraits(
          {
            genres: details.genres,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            tagline: details.tagline,
            overview: details.overview,
            popularity: details.popularity,
          },
          'movie'
        ),
        related_genres: details.genres ?? [],
      };
    } else {
      // Fetch TV show details and related content
      const [details, related] = await Promise.all([
        getTVShowDetailsExtended(contentId),
        getRelatedTVShows(contentId),
      ]);

      const contentType = getContentType({
        ...details,
        media_type: 'tv',
      } as unknown as TVShow);

      // Convert related TV shows
      const similarShows = related.map((s) => ({
        ...toTVShow(s),
        media_type: 'tv' as const,
      }));

      response = {
        source: {
          id: details.id,
          title: details.name,
          overview: details.overview,
          tagline: details.tagline,
          poster_path: details.poster_path,
          backdrop_path: details.backdrop_path,
          release_date: details.first_air_date,
          vote_average: details.vote_average,
          vote_count: details.vote_count,
          genres: details.genres ?? [],
          content_type: contentType,
          media_type: 'tv',
          number_of_seasons: details.number_of_seasons,
          number_of_episodes: details.number_of_episodes,
          status: details.status,
        },
        similar: similarShows,
        traits: extractTraits(
          {
            genres: details.genres,
            vote_average: details.vote_average,
            vote_count: details.vote_count,
            tagline: details.tagline,
            overview: details.overview,
            popularity: details.popularity,
          },
          'tv'
        ),
        related_genres: details.genres ?? [],
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Similar Content API error:', error);

    // Check if it's a 404 from TMDB
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Content not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch similar content',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Revalidate every 24 hours
export const revalidate = 86400;
