// ==========================================================================
// TMDB TV Functions
// Functions for fetching TV show data from TMDB
// ==========================================================================

import { tmdbFetch, type TMDBResponse } from './client';
import type {
  TVShow,
  Genre,
  Credits,
  Video,
  Season,
  Episode,
  Network,
  Creator,
  ProvidersByCountry,
  EpisodeStatus,
} from '@/types';

// ==========================================================================
// Types
// ==========================================================================

export interface TMDBTVShow {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date?: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  original_language: string;
  origin_country: string[];
  adult: boolean;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: string;
  tagline?: string;
  type?: string;
  homepage?: string;
  in_production?: boolean;
  networks?: Network[];
  created_by?: Creator[];
  seasons?: TMDBSeason[];
  last_episode_to_air?: TMDBEpisode | null;
  next_episode_to_air?: TMDBEpisode | null;
  production_companies?: ProductionCompany[];
}

export interface TMDBSeason {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  season_number: number;
  episode_count: number;
  air_date: string;
  vote_average?: number;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string | null;
  episode_number: number;
  season_number: number;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  production_code?: string;
  show_id?: number;
}

interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

interface KeywordsResponse {
  id: number;
  results: { id: number; name: string }[];
}

interface VideosResponse {
  id: number;
  results: Video[];
}

interface CreditsResponse {
  id: number;
  cast: Credits['cast'];
  crew: Credits['crew'];
}

interface WatchProvidersResponse {
  id: number;
  results: ProvidersByCountry;
}

interface SeasonDetailsResponse extends TMDBSeason {
  episodes: TMDBEpisode[];
}

// ==========================================================================
// TV Show Details
// ==========================================================================

/**
 * Get detailed information about a TV show
 */
export async function getTVShowDetails(showId: number): Promise<TMDBTVShow> {
  return tmdbFetch<TMDBTVShow>(`/tv/${showId}`);
}

/**
 * Get TV show details with additional data (credits, videos, providers)
 */
export async function getTVShowDetailsExtended(showId: number) {
  const [show, credits, videos, providers, keywords] = await Promise.all([
    getTVShowDetails(showId),
    getTVShowCredits(showId),
    getTVShowVideos(showId),
    getTVShowWatchProviders(showId),
    getTVShowKeywords(showId),
  ]);

  return {
    ...show,
    credits,
    videos: videos.results,
    providers: providers.results,
    keywords: keywords.results,
  };
}

// ==========================================================================
// TV Show Credits
// ==========================================================================

/**
 * Get cast and crew for a TV show
 */
export async function getTVShowCredits(showId: number): Promise<Credits> {
  const response = await tmdbFetch<CreditsResponse>(`/tv/${showId}/credits`);
  return {
    cast: response.cast,
    crew: response.crew,
  };
}

// ==========================================================================
// TV Show Videos
// ==========================================================================

/**
 * Get videos (trailers, teasers, etc.) for a TV show
 */
export async function getTVShowVideos(showId: number): Promise<VideosResponse> {
  return tmdbFetch<VideosResponse>(`/tv/${showId}/videos`);
}

/**
 * Get the official trailer for a TV show
 */
export async function getTVShowTrailer(showId: number): Promise<Video | null> {
  const { results } = await getTVShowVideos(showId);

  const officialTrailer = results.find(
    (v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official
  );
  if (officialTrailer) return officialTrailer;

  const officialTeaser = results.find(
    (v) => v.site === 'YouTube' && v.type === 'Teaser' && v.official
  );
  if (officialTeaser) return officialTeaser;

  const anyTrailer = results.find((v) => v.site === 'YouTube' && v.type === 'Trailer');
  if (anyTrailer) return anyTrailer;

  return results.find((v) => v.site === 'YouTube') ?? null;
}

// ==========================================================================
// TV Show Keywords
// ==========================================================================

/**
 * Get keywords for a TV show
 */
export async function getTVShowKeywords(showId: number): Promise<KeywordsResponse> {
  return tmdbFetch<KeywordsResponse>(`/tv/${showId}/keywords`);
}

// ==========================================================================
// Watch Providers
// ==========================================================================

/**
 * Get streaming/rental/purchase providers for a TV show
 */
export async function getTVShowWatchProviders(showId: number): Promise<WatchProvidersResponse> {
  return tmdbFetch<WatchProvidersResponse>(`/tv/${showId}/watch/providers`);
}

// ==========================================================================
// Seasons & Episodes
// ==========================================================================

/**
 * Get detailed season information including all episodes
 */
export async function getSeasonDetails(
  showId: number,
  seasonNumber: number
): Promise<SeasonDetailsResponse> {
  return tmdbFetch<SeasonDetailsResponse>(`/tv/${showId}/season/${seasonNumber}`);
}

/**
 * Get specific episode details
 */
export async function getEpisodeDetails(
  showId: number,
  seasonNumber: number,
  episodeNumber: number
): Promise<TMDBEpisode> {
  return tmdbFetch<TMDBEpisode>(`/tv/${showId}/season/${seasonNumber}/episode/${episodeNumber}`);
}

/**
 * Calculate episode status for a TV show (how many released, upcoming, etc.)
 */
export async function getEpisodeStatus(showId: number): Promise<EpisodeStatus> {
  const show = await getTVShowDetails(showId);
  const now = new Date();

  let totalEpisodes = 0;
  let releasedEpisodes = 0;

  // Get the current/latest season with episodes
  const currentSeasonNumber =
    show.seasons?.filter((s) => s.season_number > 0).slice(-1)[0]?.season_number ?? 1;

  let seasonDetails: SeasonDetailsResponse | null = null;
  try {
    seasonDetails = await getSeasonDetails(showId, currentSeasonNumber);
  } catch {
    // Season might not have episode data
  }

  if (seasonDetails?.episodes) {
    totalEpisodes = seasonDetails.episodes.length;
    releasedEpisodes = seasonDetails.episodes.filter((ep) => {
      if (!ep.air_date) return false;
      return new Date(ep.air_date) <= now;
    }).length;
  } else {
    // Fallback to show-level data
    totalEpisodes = show.number_of_episodes;
    releasedEpisodes = totalEpisodes; // Assume all released if no episode data
  }

  const upcomingEpisodes = totalEpisodes - releasedEpisodes;

  // Get next/last episode info from show
  const nextEpisode = show.next_episode_to_air ? toEpisode(show.next_episode_to_air) : null;
  const lastEpisode = show.last_episode_to_air ? toEpisode(show.last_episode_to_air) : null;

  return {
    total: totalEpisodes,
    released: releasedEpisodes,
    upcoming: upcomingEpisodes,
    nextEpisode,
    lastEpisode,
    isComplete: upcomingEpisodes === 0 && totalEpisodes > 0,
    isAiring: upcomingEpisodes > 0 || show.status === 'Returning Series',
  };
}

// ==========================================================================
// Similar & Recommendations
// ==========================================================================

/**
 * Get similar TV shows
 */
export async function getSimilarTVShows(
  showId: number,
  page: number = 1
): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>(`/tv/${showId}/similar`, { page });
}

/**
 * Get TV show recommendations
 */
export async function getTVShowRecommendations(
  showId: number,
  page: number = 1
): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>(`/tv/${showId}/recommendations`, { page });
}

/**
 * Get combined similar and recommended TV shows (deduplicated)
 */
export async function getRelatedTVShows(showId: number): Promise<TMDBTVShow[]> {
  const [similar, recommendations] = await Promise.all([
    getSimilarTVShows(showId),
    getTVShowRecommendations(showId),
  ]);

  const combined = [...(similar.results ?? []), ...(recommendations.results ?? [])];
  const uniqueMap = new Map<number, TMDBTVShow>();

  combined.forEach((show) => {
    if (!uniqueMap.has(show.id)) {
      uniqueMap.set(show.id, show);
    }
  });

  return Array.from(uniqueMap.values());
}

// ==========================================================================
// Trending & Popular
// ==========================================================================

/**
 * Get trending TV shows
 */
export async function getTrendingTVShows(
  timeWindow: 'day' | 'week' = 'day',
  page: number = 1
): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>(`/trending/tv/${timeWindow}`, { page });
}

/**
 * Get popular TV shows
 */
export async function getPopularTVShows(page: number = 1): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/tv/popular', { page });
}

/**
 * Get top rated TV shows
 */
export async function getTopRatedTVShows(page: number = 1): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/tv/top_rated', { page });
}

/**
 * Get TV shows airing today
 */
export async function getAiringTodayTVShows(page: number = 1): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/tv/airing_today', { page });
}

/**
 * Get TV shows currently on the air
 */
export async function getOnTheAirTVShows(page: number = 1): Promise<TMDBResponse<TMDBTVShow>> {
  return tmdbFetch<TMDBResponse<TMDBTVShow>>('/tv/on_the_air', { page });
}

// ==========================================================================
// Genre Lists
// ==========================================================================

/**
 * Get list of TV genres
 */
export async function getTVGenres(): Promise<Genre[]> {
  const response = await tmdbFetch<{ genres: Genre[] }>('/genre/tv/list');
  return response.genres;
}

// ==========================================================================
// Helper: Convert TMDB TV to App TV Type
// ==========================================================================

/**
 * Convert TMDB TV show response to our TVShow type
 */
export function toTVShow(tmdbShow: TMDBTVShow): TVShow {
  return {
    id: tmdbShow.id,
    media_type: 'tv',
    name: tmdbShow.name,
    original_name: tmdbShow.original_name,
    overview: tmdbShow.overview,
    poster_path: tmdbShow.poster_path,
    backdrop_path: tmdbShow.backdrop_path,
    first_air_date: tmdbShow.first_air_date,
    last_air_date: tmdbShow.last_air_date,
    vote_average: tmdbShow.vote_average,
    vote_count: tmdbShow.vote_count,
    popularity: tmdbShow.popularity,
    genre_ids: tmdbShow.genre_ids,
    genres: tmdbShow.genres,
    original_language: tmdbShow.original_language,
    origin_country: tmdbShow.origin_country,
    number_of_seasons: tmdbShow.number_of_seasons,
    number_of_episodes: tmdbShow.number_of_episodes,
    episode_run_time: tmdbShow.episode_run_time,
    status: tmdbShow.status as TVShow['status'],
    type: tmdbShow.type ?? 'Scripted',
    networks: tmdbShow.networks,
    created_by: tmdbShow.created_by,
    seasons: tmdbShow.seasons?.map(toSeason),
  };
}

/**
 * Convert TMDB season to our Season type
 */
export function toSeason(tmdbSeason: TMDBSeason): Season {
  return {
    id: tmdbSeason.id,
    name: tmdbSeason.name,
    overview: tmdbSeason.overview,
    poster_path: tmdbSeason.poster_path,
    season_number: tmdbSeason.season_number,
    episode_count: tmdbSeason.episode_count,
    air_date: tmdbSeason.air_date,
  };
}

/**
 * Convert TMDB episode to our Episode type
 */
export function toEpisode(tmdbEpisode: TMDBEpisode): Episode {
  return {
    id: tmdbEpisode.id,
    name: tmdbEpisode.name,
    overview: tmdbEpisode.overview,
    still_path: tmdbEpisode.still_path,
    air_date: tmdbEpisode.air_date,
    episode_number: tmdbEpisode.episode_number,
    season_number: tmdbEpisode.season_number,
    runtime: tmdbEpisode.runtime,
    vote_average: tmdbEpisode.vote_average,
    vote_count: tmdbEpisode.vote_count,
  };
}
