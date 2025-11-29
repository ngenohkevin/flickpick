// ==========================================================================
// TMDB Movie Functions
// Functions for fetching movie data from TMDB
// ==========================================================================

import { tmdbFetch, type TMDBResponse } from './client';
import type {
  Movie,
  Genre,
  Credits,
  Video,
  ProvidersByCountry,
} from '@/types';

// ==========================================================================
// Types
// ==========================================================================

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  original_language: string;
  adult: boolean;
  video: boolean;
  runtime?: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  status?: string;
  homepage?: string;
  imdb_id?: string;
  production_companies?: ProductionCompany[];
  production_countries?: ProductionCountry[];
  spoken_languages?: SpokenLanguage[];
  belongs_to_collection?: Collection | null;
}

interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

interface SpokenLanguage {
  iso_639_1: string;
  name: string;
  english_name: string;
}

interface Collection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

interface Keyword {
  id: number;
  name: string;
}

interface KeywordsResponse {
  id: number;
  keywords: Keyword[];
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

// ==========================================================================
// Movie Details
// ==========================================================================

/**
 * Get detailed information about a movie
 */
export async function getMovieDetails(movieId: number): Promise<TMDBMovie> {
  return tmdbFetch<TMDBMovie>(`/movie/${movieId}`);
}

/**
 * Get movie details with additional data (credits, videos, providers)
 */
export async function getMovieDetailsExtended(movieId: number) {
  const [movie, credits, videos, providers, keywords] = await Promise.all([
    getMovieDetails(movieId),
    getMovieCredits(movieId),
    getMovieVideos(movieId),
    getMovieWatchProviders(movieId),
    getMovieKeywords(movieId),
  ]);

  return {
    ...movie,
    credits,
    videos: videos.results,
    providers: providers.results,
    keywords: keywords.keywords,
  };
}

// ==========================================================================
// Movie Credits
// ==========================================================================

/**
 * Get cast and crew for a movie
 */
export async function getMovieCredits(movieId: number): Promise<Credits> {
  const response = await tmdbFetch<CreditsResponse>(`/movie/${movieId}/credits`);
  return {
    cast: response.cast,
    crew: response.crew,
  };
}

// ==========================================================================
// Movie Videos
// ==========================================================================

/**
 * Get videos (trailers, teasers, etc.) for a movie
 */
export async function getMovieVideos(movieId: number): Promise<VideosResponse> {
  return tmdbFetch<VideosResponse>(`/movie/${movieId}/videos`);
}

/**
 * Get the official trailer for a movie (prioritizes official YouTube trailers)
 */
export async function getMovieTrailer(movieId: number): Promise<Video | null> {
  const { results } = await getMovieVideos(movieId);

  // Priority: Official Trailer > Official Teaser > Any Trailer > Any Video
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

  const anyYouTube = results.find((v) => v.site === 'YouTube');
  return anyYouTube ?? null;
}

// ==========================================================================
// Movie Keywords
// ==========================================================================

/**
 * Get keywords for a movie
 */
export async function getMovieKeywords(movieId: number): Promise<KeywordsResponse> {
  return tmdbFetch<KeywordsResponse>(`/movie/${movieId}/keywords`);
}

// ==========================================================================
// Watch Providers
// ==========================================================================

/**
 * Get streaming/rental/purchase providers for a movie
 */
export async function getMovieWatchProviders(
  movieId: number
): Promise<WatchProvidersResponse> {
  return tmdbFetch<WatchProvidersResponse>(`/movie/${movieId}/watch/providers`);
}

// ==========================================================================
// Similar & Recommendations
// ==========================================================================

/**
 * Get similar movies
 */
export async function getSimilarMovies(
  movieId: number,
  page: number = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>(`/movie/${movieId}/similar`, { page });
}

/**
 * Get movie recommendations (TMDB algorithm)
 */
export async function getMovieRecommendations(
  movieId: number,
  page: number = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>(`/movie/${movieId}/recommendations`, { page });
}

/**
 * Get combined similar and recommended movies (deduplicated)
 */
export async function getRelatedMovies(movieId: number): Promise<TMDBMovie[]> {
  const [similar, recommendations] = await Promise.all([
    getSimilarMovies(movieId),
    getMovieRecommendations(movieId),
  ]);

  // Combine and deduplicate by ID
  const combined = [...(similar.results ?? []), ...(recommendations.results ?? [])];
  const uniqueMap = new Map<number, TMDBMovie>();

  combined.forEach((movie) => {
    if (!uniqueMap.has(movie.id)) {
      uniqueMap.set(movie.id, movie);
    }
  });

  return Array.from(uniqueMap.values());
}

// ==========================================================================
// Trending & Popular
// ==========================================================================

/**
 * Get trending movies
 */
export async function getTrendingMovies(
  timeWindow: 'day' | 'week' = 'day',
  page: number = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>(`/trending/movie/${timeWindow}`, { page });
}

/**
 * Get popular movies
 */
export async function getPopularMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/movie/popular', { page });
}

/**
 * Get top rated movies
 */
export async function getTopRatedMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/movie/top_rated', { page });
}

/**
 * Get movies now playing in theaters
 */
export async function getNowPlayingMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/movie/now_playing', { page });
}

/**
 * Get upcoming movies
 */
export async function getUpcomingMovies(page: number = 1): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch<TMDBResponse<TMDBMovie>>('/movie/upcoming', { page });
}

// ==========================================================================
// Genre Lists
// ==========================================================================

/**
 * Get list of movie genres
 */
export async function getMovieGenres(): Promise<Genre[]> {
  const response = await tmdbFetch<{ genres: Genre[] }>('/genre/movie/list');
  return response.genres;
}

// ==========================================================================
// Helper: Convert TMDB Movie to App Movie Type
// ==========================================================================

/**
 * Convert TMDB movie response to our Movie type
 */
export function toMovie(tmdbMovie: TMDBMovie): Movie {
  return {
    id: tmdbMovie.id,
    media_type: 'movie',
    title: tmdbMovie.title,
    original_title: tmdbMovie.original_title,
    overview: tmdbMovie.overview,
    poster_path: tmdbMovie.poster_path,
    backdrop_path: tmdbMovie.backdrop_path,
    release_date: tmdbMovie.release_date,
    vote_average: tmdbMovie.vote_average,
    vote_count: tmdbMovie.vote_count,
    popularity: tmdbMovie.popularity,
    genre_ids: tmdbMovie.genre_ids,
    genres: tmdbMovie.genres,
    original_language: tmdbMovie.original_language,
    adult: tmdbMovie.adult,
    runtime: tmdbMovie.runtime,
    tagline: tmdbMovie.tagline,
    budget: tmdbMovie.budget,
    revenue: tmdbMovie.revenue,
  };
}
