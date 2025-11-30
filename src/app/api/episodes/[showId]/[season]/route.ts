// ==========================================================================
// Episodes API Route
// GET /api/episodes/[showId]/[season] - Fetch episode list for a season
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getTVShowDetails, getSeasonDetails, toEpisode } from '@/lib/tmdb/tv';
import type { Episode, EpisodeStatus, Season } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface EpisodeWithStatus extends Episode {
  is_released: boolean;
  days_until: number | null;
}

interface SeasonEpisodesResponse {
  show: {
    id: number;
    name: string;
  };
  season: Season;
  episodes: EpisodeWithStatus[];
  status: EpisodeStatus;
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ showId: string; season: string }> }
) {
  try {
    const { showId, season } = await params;
    const showIdNum = parseInt(showId, 10);
    const seasonNum = parseInt(season, 10);

    if (isNaN(showIdNum) || isNaN(seasonNum)) {
      return NextResponse.json(
        { error: 'Invalid show ID or season number', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Fetch show details and season details in parallel
    const [show, seasonDetails] = await Promise.all([
      getTVShowDetails(showIdNum),
      getSeasonDetails(showIdNum, seasonNum),
    ]);

    const now = new Date();

    // Calculate status for each episode
    const episodes: EpisodeWithStatus[] = (seasonDetails.episodes ?? []).map((ep) => {
      const episode = toEpisode(ep);
      const airDate = ep.air_date ? new Date(ep.air_date) : null;
      const isReleased = airDate ? airDate <= now : false;

      let daysUntil: number | null = null;
      if (airDate && !isReleased) {
        const diffTime = airDate.getTime() - now.getTime();
        daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...episode,
        is_released: isReleased,
        days_until: daysUntil,
      };
    });

    // Calculate overall season status
    const total = episodes.length;
    const released = episodes.filter((ep) => ep.is_released).length;
    const upcoming = total - released;

    // Find next and last episodes
    const releasedEpisodes = episodes.filter((ep) => ep.is_released);
    const upcomingEpisodes = episodes.filter((ep) => !ep.is_released);

    const lastEpisode = releasedEpisodes.length > 0 ? releasedEpisodes[releasedEpisodes.length - 1] : null;
    const nextEpisode = upcomingEpisodes.length > 0 ? upcomingEpisodes[0] : null;

    const status: EpisodeStatus = {
      total,
      released,
      upcoming,
      nextEpisode: nextEpisode ? {
        id: nextEpisode.id,
        name: nextEpisode.name,
        overview: nextEpisode.overview,
        episode_number: nextEpisode.episode_number,
        season_number: nextEpisode.season_number,
        air_date: nextEpisode.air_date,
        still_path: nextEpisode.still_path,
        runtime: nextEpisode.runtime,
        vote_average: nextEpisode.vote_average,
        vote_count: nextEpisode.vote_count,
      } : null,
      lastEpisode: lastEpisode ? {
        id: lastEpisode.id,
        name: lastEpisode.name,
        overview: lastEpisode.overview,
        episode_number: lastEpisode.episode_number,
        season_number: lastEpisode.season_number,
        air_date: lastEpisode.air_date,
        still_path: lastEpisode.still_path,
        runtime: lastEpisode.runtime,
        vote_average: lastEpisode.vote_average,
        vote_count: lastEpisode.vote_count,
      } : null,
      isComplete: upcoming === 0 && total > 0,
      isAiring: upcoming > 0,
    };

    const response: SeasonEpisodesResponse = {
      show: {
        id: show.id,
        name: show.name,
      },
      season: {
        id: seasonDetails.id,
        name: seasonDetails.name,
        season_number: seasonDetails.season_number,
        episode_count: seasonDetails.episode_count,
        air_date: seasonDetails.air_date,
        poster_path: seasonDetails.poster_path,
        overview: seasonDetails.overview,
      },
      episodes,
      status,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Episodes API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch episodes',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
