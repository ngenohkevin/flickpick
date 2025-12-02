// ==========================================================================
// Content Availability Functions
// Combines TMDB data with Torrentio availability checking
// ==========================================================================

import { tmdbFetch } from '@/lib/tmdb/client';
import { checkMovieAvailability, checkTVAvailability } from './client';
import type { AvailabilityStatus } from './types';
import type { Movie, TVShow, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface ExternalIdsResponse {
  id: number;
  imdb_id: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
  wikidata_id?: string | null;
}

export interface MovieWithAvailability extends Movie {
  imdb_id: string | null;
  availability: AvailabilityStatus;
}

export interface TVShowWithAvailability extends TVShow {
  imdb_id: string | null;
  availability: AvailabilityStatus;
  latestEpisode?: {
    season: number;
    episode: number;
    name: string;
    airDate: string | null;
  };
  seasonProgress?: {
    currentSeason: number;
    releasedEpisodes: number;
    totalEpisodes: number;
    isComplete: boolean;
    isNewShow: boolean; // First episode of season 1
  };
}

export type ContentWithAvailability = MovieWithAvailability | TVShowWithAvailability;

// ==========================================================================
// IMDB ID Fetching
// ==========================================================================

/**
 * Get external IDs (including IMDB) for a movie
 */
export async function getMovieExternalIds(movieId: number): Promise<ExternalIdsResponse> {
  return tmdbFetch<ExternalIdsResponse>(`/movie/${movieId}/external_ids`);
}

/**
 * Get external IDs (including IMDB) for a TV show
 */
export async function getTVExternalIds(showId: number): Promise<ExternalIdsResponse> {
  return tmdbFetch<ExternalIdsResponse>(`/tv/${showId}/external_ids`);
}

// ==========================================================================
// Availability Checking
// ==========================================================================

/**
 * Check availability for a single movie
 */
export async function getMovieWithAvailability(
  movie: Movie
): Promise<MovieWithAvailability> {
  try {
    const externalIds = await getMovieExternalIds(movie.id);
    const imdbId = externalIds.imdb_id;

    if (!imdbId) {
      return {
        ...movie,
        imdb_id: null,
        availability: {
          available: false,
          streamCount: 0,
          bestQuality: null,
          sources: [],
          audioCodec: null,
          videoCodec: null,
          hasHDR: false,
        },
      };
    }

    const availability = await checkMovieAvailability(imdbId);

    return {
      ...movie,
      imdb_id: imdbId,
      availability,
    };
  } catch (error) {
    console.error(`Failed to check availability for movie ${movie.id}:`, error);
    return {
      ...movie,
      imdb_id: null,
      availability: {
        available: false,
        streamCount: 0,
        bestQuality: null,
        sources: [],
        audioCodec: null,
        videoCodec: null,
        hasHDR: false,
      },
    };
  }
}

/**
 * Check availability for a single TV show
 */
export async function getTVShowWithAvailability(
  show: TVShow,
  season: number = 1,
  episode: number = 1
): Promise<TVShowWithAvailability> {
  try {
    const externalIds = await getTVExternalIds(show.id);
    const imdbId = externalIds.imdb_id;

    if (!imdbId) {
      return {
        ...show,
        imdb_id: null,
        availability: {
          available: false,
          streamCount: 0,
          bestQuality: null,
          sources: [],
          audioCodec: null,
          videoCodec: null,
          hasHDR: false,
        },
      };
    }

    const availability = await checkTVAvailability(imdbId, season, episode);

    return {
      ...show,
      imdb_id: imdbId,
      availability,
    };
  } catch (error) {
    console.error(`Failed to check availability for TV show ${show.id}:`, error);
    return {
      ...show,
      imdb_id: null,
      availability: {
        available: false,
        streamCount: 0,
        bestQuality: null,
        sources: [],
        audioCodec: null,
        videoCodec: null,
        hasHDR: false,
      },
    };
  }
}

/**
 * Filter movies to only those available (with valid streams)
 * Returns movies with availability info attached
 */
export async function filterAvailableMovies(
  movies: Movie[],
  limit: number = 15
): Promise<MovieWithAvailability[]> {
  const availableMovies: MovieWithAvailability[] = [];

  // Process in smaller batches to avoid network congestion
  const BATCH_SIZE = 5; // Reduced from 8

  for (let i = 0; i < movies.length && availableMovies.length < limit; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((movie) => getMovieWithAvailability(movie))
    );

    for (const result of results) {
      if (result.availability.available && availableMovies.length < limit) {
        availableMovies.push(result);
      }
    }

    // If we have enough, stop early
    if (availableMovies.length >= limit) {
      break;
    }
  }

  return availableMovies;
}

/**
 * Filter TV shows to only those available
 */
export async function filterAvailableTVShows(
  shows: TVShow[],
  limit: number = 20
): Promise<TVShowWithAvailability[]> {
  const availableShows: TVShowWithAvailability[] = [];

  const BATCH_SIZE = 5;

  for (let i = 0; i < shows.length && availableShows.length < limit; i += BATCH_SIZE) {
    const batch = shows.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((show) => getTVShowWithAvailability(show))
    );

    for (const result of results) {
      if (result.availability.available && availableShows.length < limit) {
        availableShows.push(result);
      }
    }
  }

  return availableShows;
}

/**
 * Get recently released movies that are actually available
 * Combines TMDB "recent" with Torrentio availability
 */
export async function getJustReleasedMovies(
  candidateMovies: Movie[],
  limit: number = 12
): Promise<MovieWithAvailability[]> {
  // Sort by release date (newest first)
  const sorted = [...candidateMovies].sort((a, b) => {
    const dateA = new Date(a.release_date).getTime();
    const dateB = new Date(b.release_date).getTime();
    return dateB - dateA;
  });

  return filterAvailableMovies(sorted, limit);
}

/**
 * Get mixed content (movies + TV) that's available
 */
export async function getAvailableContent(
  movies: Movie[],
  tvShows: TVShow[],
  limit: number = 12
): Promise<ContentWithAvailability[]> {
  const [availableMovies, availableTVShows] = await Promise.all([
    filterAvailableMovies(movies, Math.ceil(limit / 2)),
    filterAvailableTVShows(tvShows, Math.ceil(limit / 2)),
  ]);

  // Interleave movies and TV shows
  const result: ContentWithAvailability[] = [];
  const maxLen = Math.max(availableMovies.length, availableTVShows.length);

  for (let i = 0; i < maxLen && result.length < limit; i++) {
    if (i < availableMovies.length && result.length < limit) {
      result.push(availableMovies[i]!);
    }
    if (i < availableTVShows.length && result.length < limit) {
      result.push(availableTVShows[i]!);
    }
  }

  return result;
}

// ==========================================================================
// TV Show Episode Info
// ==========================================================================

interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
}

interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
}

interface TMDBTVShowWithEpisodes {
  id: number;
  last_episode_to_air?: TMDBEpisode | null;
  next_episode_to_air?: TMDBEpisode | null;
  seasons?: TMDBSeason[];
  number_of_seasons: number;
}

/**
 * Get TV show with latest episode info and verify availability via Torrentio
 * For TV shows, we check the latest aired episode
 */
export async function getTVShowWithLatestEpisode(
  show: TVShow
): Promise<TVShowWithAvailability> {
  try {
    // Get show details to find the latest episode
    const showDetails = await tmdbFetch<TMDBTVShowWithEpisodes>(`/tv/${show.id}`);
    const lastEpisode = showDetails.last_episode_to_air;
    const nextEpisode = showDetails.next_episode_to_air;

    // Get external IDs for IMDB
    const externalIds = await getTVExternalIds(show.id);
    const imdbId = externalIds.imdb_id;

    // Calculate season progress
    let seasonProgress: TVShowWithAvailability['seasonProgress'] = undefined;
    if (lastEpisode && showDetails.seasons) {
      const currentSeasonNumber = lastEpisode.season_number;
      const currentSeason = showDetails.seasons.find(
        (s) => s.season_number === currentSeasonNumber
      );

      if (currentSeason) {
        const totalEpisodes = currentSeason.episode_count;
        const releasedEpisodes = lastEpisode.episode_number;

        // Season is complete if:
        // 1. Released episodes = total episodes, OR
        // 2. No next episode is scheduled (for shows without pre-announced episode counts)
        const isComplete = releasedEpisodes >= totalEpisodes ||
          (!nextEpisode && releasedEpisodes > 0 && totalEpisodes > 0 && releasedEpisodes === totalEpisodes);

        // It's a new show if it's season 1 episode 1
        const isNewShow = currentSeasonNumber === 1 && releasedEpisodes === 1;

        seasonProgress = {
          currentSeason: currentSeasonNumber,
          releasedEpisodes,
          totalEpisodes,
          isComplete,
          isNewShow,
        };
      }
    }

    if (!imdbId) {
      return {
        ...show,
        imdb_id: null,
        availability: {
          available: false,
          streamCount: 0,
          bestQuality: null,
          sources: [],
          audioCodec: null,
          videoCodec: null,
          hasHDR: false,
        },
        latestEpisode: lastEpisode ? {
          season: lastEpisode.season_number,
          episode: lastEpisode.episode_number,
          name: lastEpisode.name,
          airDate: lastEpisode.air_date,
        } : undefined,
        seasonProgress,
      };
    }

    // Check availability for the latest episode
    const season = lastEpisode?.season_number ?? 1;
    const episode = lastEpisode?.episode_number ?? 1;
    const availability = await checkTVAvailability(imdbId, season, episode);

    return {
      ...show,
      imdb_id: imdbId,
      availability,
      latestEpisode: lastEpisode ? {
        season: lastEpisode.season_number,
        episode: lastEpisode.episode_number,
        name: lastEpisode.name,
        airDate: lastEpisode.air_date,
      } : undefined,
      seasonProgress,
    };
  } catch (error) {
    console.error(`Failed to check availability for TV show ${show.id}:`, error);
    return {
      ...show,
      imdb_id: null,
      availability: {
        available: false,
        streamCount: 0,
        bestQuality: null,
        sources: [],
        audioCodec: null,
        videoCodec: null,
        hasHDR: false,
      },
    };
  }
}

/**
 * Get TV show with latest episode info, checking air date FIRST before Torrentio
 * This avoids wasting API calls on old shows
 */
export async function getTVShowWithLatestEpisodeIfRecent(
  show: TVShow,
  cutoffDate: Date
): Promise<TVShowWithAvailability | null> {
  try {
    // Get show details to find the latest episode FIRST
    const showDetails = await tmdbFetch<TMDBTVShowWithEpisodes>(`/tv/${show.id}`);
    const lastEpisode = showDetails.last_episode_to_air;
    const nextEpisode = showDetails.next_episode_to_air;

    // Check air date BEFORE doing any Torrentio calls
    if (!lastEpisode?.air_date) {
      return null; // No episode data, skip
    }

    const episodeAirDate = new Date(lastEpisode.air_date);
    if (episodeAirDate < cutoffDate) {
      // Episode is too old, skip Torrentio check entirely
      return null;
    }

    // Episode is recent, now check Torrentio availability
    const externalIds = await getTVExternalIds(show.id);
    const imdbId = externalIds.imdb_id;

    // Calculate season progress
    let seasonProgress: TVShowWithAvailability['seasonProgress'] = undefined;
    if (lastEpisode && showDetails.seasons) {
      const currentSeasonNumber = lastEpisode.season_number;
      const currentSeason = showDetails.seasons.find(
        (s) => s.season_number === currentSeasonNumber
      );

      if (currentSeason) {
        const totalEpisodes = currentSeason.episode_count;
        const releasedEpisodes = lastEpisode.episode_number;
        const isComplete = releasedEpisodes >= totalEpisodes ||
          (!nextEpisode && releasedEpisodes > 0 && totalEpisodes > 0 && releasedEpisodes === totalEpisodes);
        const isNewShow = currentSeasonNumber === 1 && releasedEpisodes === 1;

        seasonProgress = {
          currentSeason: currentSeasonNumber,
          releasedEpisodes,
          totalEpisodes,
          isComplete,
          isNewShow,
        };
      }
    }

    if (!imdbId) {
      return null; // No IMDB ID, can't check Torrentio
    }

    // Check availability for the latest episode
    const season = lastEpisode.season_number;
    const episode = lastEpisode.episode_number;
    const availability = await checkTVAvailability(imdbId, season, episode);

    if (!availability.available) {
      return null; // Not available on Torrentio
    }

    return {
      ...show,
      imdb_id: imdbId,
      availability,
      latestEpisode: {
        season: lastEpisode.season_number,
        episode: lastEpisode.episode_number,
        name: lastEpisode.name,
        airDate: lastEpisode.air_date,
      },
      seasonProgress,
    };
  } catch (error) {
    console.error(`Failed to check TV show ${show.id}:`, error);
    return null;
  }
}

/**
 * Filter TV shows with recently aired episodes that are available
 * TV shows don't go through theaters, so when an episode airs, it's immediately available
 * Only includes shows with episodes aired within the last 30 days
 *
 * OPTIMIZATION: Checks air date BEFORE Torrentio to avoid wasting API calls on old shows
 */
export async function filterJustReleasedTVShows(
  shows: TVShow[],
  limit: number = 15,
  maxDaysOld: number = 30
): Promise<TVShowWithAvailability[]> {
  const availableShows: TVShowWithAvailability[] = [];
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - maxDaysOld);

  // Process in smaller batches to avoid network congestion
  const BATCH_SIZE = 5; // Reduced from 10

  for (let i = 0; i < shows.length && availableShows.length < limit; i += BATCH_SIZE) {
    const batch = shows.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map((show) => getTVShowWithLatestEpisodeIfRecent(show, cutoffDate))
    );

    for (const result of results) {
      // Result is null if episode is too old or not available
      if (result && availableShows.length < limit) {
        availableShows.push(result);
      }
    }

    // If we have enough, stop early
    if (availableShows.length >= limit) {
      break;
    }
  }

  // Sort by latest episode air date (most recent first)
  return availableShows.sort((a, b) => {
    const dateA = a.latestEpisode?.airDate ? new Date(a.latestEpisode.airDate).getTime() : 0;
    const dateB = b.latestEpisode?.airDate ? new Date(b.latestEpisode.airDate).getTime() : 0;
    return dateB - dateA;
  });
}
