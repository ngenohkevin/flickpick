// ==========================================================================
// New TV Shows API Route
// GET /api/new/shows - Fetch currently airing TV shows with episode tracking
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  getOnTheAirTVShows,
  getAiringTodayTVShows,
  getTVShowDetails,
  getSeasonDetails,
  toTVShow,
  toEpisode,
  type TMDBTVShow,
} from '@/lib/tmdb/tv';
import type { TVShow, EpisodeStatus, PaginatedResponse } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type ShowStatus = 'all' | 'airing' | 'complete' | 'returning' | 'upcoming';
type SortOption = 'next_episode' | 'updated' | 'rating' | 'popularity';

interface TVShowWithEpisodeStatus extends TVShow {
  episode_status: EpisodeStatus;
  current_season: number;
}

interface NewShowsResponse extends PaginatedResponse<TVShowWithEpisodeStatus> {
  status_filter: ShowStatus;
}

// ==========================================================================
// Helper Functions
// ==========================================================================

async function getEpisodeStatusForShow(show: TMDBTVShow): Promise<EpisodeStatus> {
  const now = new Date();

  // Default values
  let total = 0;
  let released = 0;

  // Try to get current season details
  const currentSeasonNumber =
    show.seasons?.filter((s) => s.season_number > 0).slice(-1)[0]?.season_number ?? 1;

  try {
    const seasonDetails = await getSeasonDetails(show.id, currentSeasonNumber);
    if (seasonDetails?.episodes) {
      total = seasonDetails.episodes.length;
      released = seasonDetails.episodes.filter((ep) => {
        if (!ep.air_date) return false;
        return new Date(ep.air_date) <= now;
      }).length;
    }
  } catch {
    // Use show-level data if season details fail
    total = show.number_of_episodes ?? 0;
    released = total;
  }

  const upcoming = total - released;

  // Get next/last episode from show data
  const nextEpisode = show.next_episode_to_air
    ? toEpisode(show.next_episode_to_air)
    : null;
  const lastEpisode = show.last_episode_to_air
    ? toEpisode(show.last_episode_to_air)
    : null;

  return {
    total,
    released,
    upcoming,
    nextEpisode,
    lastEpisode,
    isComplete: upcoming === 0 && total > 0,
    isAiring: upcoming > 0 || show.status === 'Returning Series',
  };
}

function filterByStatus(
  shows: TVShowWithEpisodeStatus[],
  status: ShowStatus
): TVShowWithEpisodeStatus[] {
  switch (status) {
    case 'airing':
      return shows.filter((s) => s.episode_status.isAiring && !s.episode_status.isComplete);
    case 'complete':
      return shows.filter((s) => s.episode_status.isComplete);
    case 'returning':
      return shows.filter((s) => s.status === 'Returning Series');
    case 'upcoming':
      return shows.filter(
        (s) => s.episode_status.nextEpisode && new Date(s.episode_status.nextEpisode.air_date!) > new Date()
      );
    default:
      return shows;
  }
}

function sortShows(
  shows: TVShowWithEpisodeStatus[],
  sortBy: SortOption
): TVShowWithEpisodeStatus[] {
  return [...shows].sort((a, b) => {
    switch (sortBy) {
      case 'next_episode':
        // Shows with next episodes first, sorted by date
        if (a.episode_status.nextEpisode && b.episode_status.nextEpisode) {
          return (
            new Date(a.episode_status.nextEpisode.air_date!).getTime() -
            new Date(b.episode_status.nextEpisode.air_date!).getTime()
          );
        }
        if (a.episode_status.nextEpisode) return -1;
        if (b.episode_status.nextEpisode) return 1;
        return 0;
      case 'updated':
        // Sort by last episode air date
        if (a.episode_status.lastEpisode && b.episode_status.lastEpisode) {
          return (
            new Date(b.episode_status.lastEpisode.air_date!).getTime() -
            new Date(a.episode_status.lastEpisode.air_date!).getTime()
          );
        }
        return 0;
      case 'rating':
        return b.vote_average - a.vote_average;
      case 'popularity':
      default:
        return b.popularity - a.popularity;
    }
  });
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = (searchParams.get('status') ?? 'all') as ShowStatus;
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const genres = searchParams.get('genre') ?? undefined;
    const network = searchParams.get('network') ?? undefined;
    const sortBy = (searchParams.get('sort') ?? 'next_episode') as SortOption;
    const hasNewEpisodes = searchParams.get('hasNewEpisodes') === 'true';

    // Fetch shows from TMDB
    // We fetch from both "on the air" and "airing today" to get comprehensive list
    const [onTheAir, airingToday] = await Promise.all([
      getOnTheAirTVShows(page),
      getAiringTodayTVShows(page),
    ]);

    // Combine and deduplicate
    const allShows = [...(onTheAir.results ?? []), ...(airingToday.results ?? [])];
    const uniqueShowsMap = new Map<number, TMDBTVShow>();
    allShows.forEach((show) => {
      if (!uniqueShowsMap.has(show.id)) {
        uniqueShowsMap.set(show.id, show);
      }
    });

    let shows = Array.from(uniqueShowsMap.values());

    // Apply genre filter if provided
    if (genres) {
      const genreIds = genres.split(',').map(Number);
      shows = shows.filter((show) =>
        show.genre_ids?.some((id) => genreIds.includes(id))
      );
    }

    // Fetch detailed info including episode status for each show
    // We limit to first 20 to avoid too many API calls
    const showsToProcess = shows.slice(0, 20);

    const showsWithStatus = await Promise.all(
      showsToProcess.map(async (show) => {
        try {
          // Get more details including next/last episode
          const details = await getTVShowDetails(show.id);
          const episodeStatus = await getEpisodeStatusForShow(details);

          const tvShow = toTVShow(details);

          // Get current season number
          const currentSeason =
            details.seasons?.filter((s) => s.season_number > 0).slice(-1)[0]?.season_number ?? 1;

          return {
            ...tvShow,
            episode_status: episodeStatus,
            current_season: currentSeason,
          } as TVShowWithEpisodeStatus;
        } catch {
          // Return basic show with estimated status if details fail
          const basicShow = toTVShow(show);
          return {
            ...basicShow,
            episode_status: {
              total: show.number_of_episodes ?? 0,
              released: show.number_of_episodes ?? 0,
              upcoming: 0,
              nextEpisode: null,
              lastEpisode: null,
              isComplete: false,
              isAiring: true,
            },
            current_season: show.number_of_seasons ?? 1,
          } as TVShowWithEpisodeStatus;
        }
      })
    );

    // Filter by status
    let filteredShows = filterByStatus(showsWithStatus, status);

    // Filter by hasNewEpisodes (episodes this week)
    if (hasNewEpisodes) {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      filteredShows = filteredShows.filter((show) => {
        const nextEpDate = show.episode_status.nextEpisode?.air_date;
        const lastEpDate = show.episode_status.lastEpisode?.air_date;

        if (nextEpDate) {
          const date = new Date(nextEpDate);
          if (date >= weekAgo && date <= weekFromNow) return true;
        }
        if (lastEpDate) {
          const date = new Date(lastEpDate);
          if (date >= weekAgo && date <= now) return true;
        }
        return false;
      });
    }

    // Sort shows
    const sortedShows = sortShows(filteredShows, sortBy);

    const response: NewShowsResponse = {
      results: sortedShows,
      page,
      total_pages: Math.ceil(uniqueShowsMap.size / 20),
      total_results: sortedShows.length,
      status_filter: status,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('New Shows API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch new shows',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
