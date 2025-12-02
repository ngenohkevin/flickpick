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
  limit: number = 20
): Promise<MovieWithAvailability[]> {
  const availableMovies: MovieWithAvailability[] = [];

  // Process in larger batches for faster results
  // 8 concurrent requests is a good balance between speed and not overwhelming providers
  const BATCH_SIZE = 8;

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
