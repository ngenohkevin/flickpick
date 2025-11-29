// ==========================================================================
// TV Show Details API Route
// GET /api/tv/[id]
// Returns TV show details with credits, videos, providers, and similar shows
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getTVShowDetailsExtended,
  getRelatedTVShows,
  type TMDBTVShow,
} from '@/lib/tmdb/tv';
import type { ApiError, ContentType, Credits, Video, ProvidersByCountry, Season, Network, Creator } from '@/types';
import { ANIMATION_GENRE_ID } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

interface Keyword {
  id: number;
  name: string;
}

interface TVShowResponse {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string | null;
  status: string;
  type: string | null;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: { id: number; name: string }[];
  keywords: Keyword[];
  credits: Credits;
  videos: Video[];
  providers: ProvidersByCountry;
  content_type: ContentType;
  networks: Network[];
  created_by: Creator[];
  seasons: Season[];
  in_production: boolean;
  homepage: string | null;
  next_episode_to_air: {
    id: number;
    name: string;
    air_date: string | null;
    episode_number: number;
    season_number: number;
  } | null;
  last_episode_to_air: {
    id: number;
    name: string;
    air_date: string | null;
    episode_number: number;
    season_number: number;
  } | null;
  similar: Array<{
    id: number;
    name: string;
    poster_path: string | null;
    first_air_date: string;
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
  const showId = parseInt(id, 10);

  // Validate show ID
  if (isNaN(showId) || showId <= 0) {
    const error: ApiError = {
      error: 'Invalid TV show ID',
      code: 'INVALID_INPUT',
    };
    return NextResponse.json(error, { status: 400 });
  }

  try {
    // Fetch TV show details and related shows in parallel
    const [showData, relatedShows] = await Promise.all([
      getTVShowDetailsExtended(showId),
      getRelatedTVShows(showId),
    ]);

    // Determine content type
    const contentType = getTVShowContentType(showData);

    // Format seasons (filter out season 0 / specials for main list)
    const seasons: Season[] = (showData.seasons ?? [])
      .filter((s) => s.season_number > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        overview: s.overview,
        poster_path: s.poster_path,
        season_number: s.season_number,
        episode_count: s.episode_count,
        air_date: s.air_date,
      }));

    // Format similar shows
    const similar = relatedShows.slice(0, 12).map((show) => ({
      id: show.id,
      name: show.name,
      poster_path: show.poster_path,
      first_air_date: show.first_air_date,
      vote_average: show.vote_average,
      content_type: getTVShowContentType(show),
    }));

    const response: TVShowResponse = {
      id: showData.id,
      name: showData.name,
      original_name: showData.original_name,
      overview: showData.overview,
      tagline: showData.tagline ?? null,
      poster_path: showData.poster_path,
      backdrop_path: showData.backdrop_path,
      first_air_date: showData.first_air_date,
      last_air_date: showData.last_air_date ?? null,
      status: showData.status,
      type: showData.type ?? null,
      number_of_seasons: showData.number_of_seasons,
      number_of_episodes: showData.number_of_episodes,
      episode_run_time: showData.episode_run_time ?? [],
      vote_average: showData.vote_average,
      vote_count: showData.vote_count,
      popularity: showData.popularity,
      genres: showData.genres ?? [],
      keywords: showData.keywords ?? [],
      credits: showData.credits,
      videos: showData.videos ?? [],
      providers: showData.providers ?? {},
      content_type: contentType,
      networks: showData.networks ?? [],
      created_by: showData.created_by ?? [],
      seasons,
      in_production: showData.in_production ?? false,
      homepage: showData.homepage ?? null,
      next_episode_to_air: showData.next_episode_to_air
        ? {
            id: showData.next_episode_to_air.id,
            name: showData.next_episode_to_air.name,
            air_date: showData.next_episode_to_air.air_date,
            episode_number: showData.next_episode_to_air.episode_number,
            season_number: showData.next_episode_to_air.season_number,
          }
        : null,
      last_episode_to_air: showData.last_episode_to_air
        ? {
            id: showData.last_episode_to_air.id,
            name: showData.last_episode_to_air.name,
            air_date: showData.last_episode_to_air.air_date,
            episode_number: showData.last_episode_to_air.episode_number,
            season_number: showData.last_episode_to_air.season_number,
          }
        : null,
      similar,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('TV Show API error:', error);

    // Check if it's a 404 from TMDB
    if (error instanceof Error && error.message.includes('404')) {
      const apiError: ApiError = {
        error: 'TV show not found',
        code: 'NOT_FOUND',
      };
      return NextResponse.json(apiError, { status: 404 });
    }

    const apiError: ApiError = {
      error: 'Failed to fetch TV show details',
      code: 'TMDB_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error',
    };
    return NextResponse.json(apiError, { status: 500 });
  }
}

// ==========================================================================
// Helpers
// ==========================================================================

function getTVShowContentType(show: TMDBTVShow): ContentType {
  const genreIds = show.genre_ids ?? show.genres?.map((g) => g.id) ?? [];
  const originCountry = show.origin_country ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = originCountry.includes('JP') || show.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'tv';
}
