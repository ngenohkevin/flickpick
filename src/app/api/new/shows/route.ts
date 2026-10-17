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
import { getCached } from '@/lib/redis';
import { isDailyProgramme } from '@/lib/constants';
import { mapLimit } from '@/lib/async';
import { parseEnum, parseIdList, parsePage } from '@/lib/params';
import type { TVShow, EpisodeStatus, PaginatedResponse } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type ShowStatus = 'all' | 'airing' | 'complete' | 'returning' | 'upcoming';
type SortOption = 'next_episode' | 'updated' | 'rating' | 'popularity';
const STATUSES: ShowStatus[] = ['all', 'airing', 'complete', 'returning', 'upcoming'];
const SORTS: SortOption[] = ['next_episode', 'updated', 'rating', 'popularity'];

// ==========================================================================
// Show pool
// Every show needs two extra TMDB calls (details + current season) for its
// episode status, so the pool is built once and cached; filters, sorting and
// pages are applied to the cached pool. Building it per request (and only
// for the first 20 shows) was ~40 TMDB calls a hit and dropped the rest.
// ==========================================================================

// v3: reality shows are excluded too (isDailyProgramme)
const POOL_CACHE_KEY = 'new-shows:pool:v3';
const POOL_TTL = 3600; // 1 hour: episode counts change at most daily
const ON_THE_AIR_PAGES = 5;
const POOL_SIZE = 60;
const DETAIL_CONCURRENCY = 6;
const PAGE_SIZE = 20;

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

async function withEpisodeStatus(show: TMDBTVShow): Promise<TVShowWithEpisodeStatus> {
  try {
    // Details carry next/last episode and the season list
    const details = await getTVShowDetails(show.id);
    const episodeStatus = await getEpisodeStatusForShow(details);
    const currentSeason =
      details.seasons?.filter((s) => s.season_number > 0).slice(-1)[0]?.season_number ?? 1;

    return {
      ...toTVShow(details),
      // /tv/{id} returns `genres` objects, not the list's `genre_ids`; the
      // genre filters run on genre_ids
      genre_ids: show.genre_ids ?? details.genres?.map((g) => g.id),
      episode_status: episodeStatus,
      current_season: currentSeason,
    };
  } catch {
    // Basic show with an estimated status if details fail
    return {
      ...toTVShow(show),
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
    };
  }
}

async function buildPool(): Promise<TVShowWithEpisodeStatus[]> {
  const pages = await Promise.all([
    ...Array.from({ length: ON_THE_AIR_PAGES }, (_, i) => getOnTheAirTVShows(i + 1).catch(() => null)),
    getAiringTodayTVShows(1).catch(() => null),
  ]);
  if (pages.every((p) => p === null)) {
    throw new Error('TMDB on-the-air lists unavailable');
  }

  const unique = new Map<number, TMDBTVShow>();
  for (const page of pages) {
    for (const show of page?.results ?? []) {
      if (!unique.has(show.id)) unique.set(show.id, show);
    }
  }

  const candidates = [...unique.values()]
    .filter((show) => !isDailyProgramme(show.genre_ids))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, POOL_SIZE);

  return mapLimit(candidates, DETAIL_CONCURRENCY, withEpisodeStatus);
}

// In-process copy (skips a Redis read + parse per request, and keeps the
// route cheap if Redis is down); concurrent cold requests share one build
let poolMemo: { expires: number; pool: TVShowWithEpisodeStatus[] } | null = null;
let poolBuild: Promise<TVShowWithEpisodeStatus[]> | null = null;

async function getPool(): Promise<TVShowWithEpisodeStatus[]> {
  if (poolMemo && poolMemo.expires > Date.now()) return poolMemo.pool;
  poolBuild ??= getCached(POOL_CACHE_KEY, buildPool, POOL_TTL)
    .then((pool) => {
      // Redis may hand back a copy that is nearly expired; the memo is
      // short so the two never drift far apart
      poolMemo = { expires: Date.now() + 10 * 60 * 1000, pool };
      return pool;
    })
    .finally(() => {
      poolBuild = null;
    });
  return poolBuild;
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const status = parseEnum(searchParams.get('status'), STATUSES, 'all');
    const sortBy = parseEnum(searchParams.get('sort'), SORTS, 'next_episode');
    const page = parsePage(searchParams.get('page'));
    const genreIds = parseIdList(searchParams.get('genre'));
    const excludeGenreIds = parseIdList(searchParams.get('exclude_genre'));
    const ratingParam = parseFloat(searchParams.get('rating') ?? '');
    const ratingMin = ratingParam > 0 && ratingParam <= 10 ? ratingParam : null;
    const language = searchParams.get('language')?.match(/^[a-z]{2}$/)?.[0] ?? null;
    const hasNewEpisodes = searchParams.get('hasNewEpisodes') === 'true';

    let shows = await getPool();

    // Genre include filter (OR logic: show matches ANY selected genre)
    if (genreIds.length > 0) {
      shows = shows.filter((show) => show.genre_ids?.some((id) => genreIds.includes(id)));
    }
    // Genre exclude filter (exclude shows with ANY excluded genre)
    if (excludeGenreIds.length > 0) {
      shows = shows.filter((show) => !show.genre_ids?.some((id) => excludeGenreIds.includes(id)));
    }
    if (ratingMin !== null) {
      shows = shows.filter((show) => (show.vote_average ?? 0) >= ratingMin);
    }
    if (language) {
      shows = shows.filter((show) => show.original_language === language);
    }

    // Filter by status
    let filteredShows = filterByStatus(shows, status);

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

    const sortedShows = sortShows(filteredShows, sortBy);
    const totalPages = Math.max(1, Math.ceil(sortedShows.length / PAGE_SIZE));

    const response: NewShowsResponse = {
      results: sortedShows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      total_pages: totalPages,
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
