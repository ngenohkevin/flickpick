// ==========================================================================
// FlickPick TypeScript Interfaces
// ==========================================================================

// Content Types
export type ContentType = 'movie' | 'tv' | 'animation' | 'anime';
export type MediaType = 'movie' | 'tv';

// ==========================================================================
// Base Content Types
// ==========================================================================

export interface BaseContent {
  id: number;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids?: number[];
  genres?: Genre[];
  original_language: string;
  origin_country?: string[];
}

export interface Movie extends BaseContent {
  media_type: 'movie';
  title: string;
  original_title: string;
  release_date: string;
  runtime?: number;
  tagline?: string;
  budget?: number;
  revenue?: number;
  adult: boolean;
}

export interface TVShow extends BaseContent {
  media_type: 'tv';
  name: string;
  original_name: string;
  first_air_date: string;
  last_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: 'Returning Series' | 'Ended' | 'Canceled' | 'In Production';
  type: string;
  networks?: Network[];
  created_by?: Creator[];
  seasons?: Season[];
}

export type Content = Movie | TVShow;

// ==========================================================================
// Supporting Types
// ==========================================================================

export interface Genre {
  id: number;
  name: string;
}

export interface Network {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface Creator {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface Season {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  air_date: string;
  poster_path: string | null;
  overview: string;
  episodes?: Episode[];
}

export interface Episode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
}

export interface EpisodeStatus {
  total: number;
  released: number;
  upcoming: number;
  nextEpisode: Episode | null;
  lastEpisode: Episode | null;
  isComplete: boolean;
  isAiring: boolean;
}

// ==========================================================================
// Streaming Providers
// ==========================================================================

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface WatchProviders {
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  ads?: Provider[];
  link?: string;
}

export interface ProvidersByCountry {
  [countryCode: string]: WatchProviders;
}

// ==========================================================================
// Credits
// ==========================================================================

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface Credits {
  cast: CastMember[];
  crew: CrewMember[];
}

// ==========================================================================
// Videos
// ==========================================================================

export interface Video {
  id: string;
  key: string;
  name: string;
  site: 'YouTube';
  type: 'Trailer' | 'Teaser' | 'Clip' | 'Featurette' | 'Behind the Scenes';
  official: boolean;
  published_at: string;
}

// ==========================================================================
// Search & Discovery
// ==========================================================================

export interface SearchResult {
  id: number;
  title: string;
  media_type: MediaType;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  content_type: ContentType;
}

export interface ContentWithReason extends BaseContent {
  title: string;
  media_type: MediaType;
  content_type: ContentType;
  reason: string;
}

// ==========================================================================
// Categories & Moods
// ==========================================================================

export interface Mood {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
}

export interface Category {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

// ==========================================================================
// Watchlist
// ==========================================================================

export interface WatchlistItem {
  id: number;
  title: string;
  media_type: MediaType;
  content_type: ContentType;
  poster_path: string | null;
  added_at: string;
}

// ==========================================================================
// API Responses
// ==========================================================================

export interface ApiError {
  error: string;
  code: 'NOT_FOUND' | 'TMDB_ERROR' | 'AI_ERROR' | 'RATE_LIMITED' | 'INVALID_INPUT';
  details?: string;
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

// ==========================================================================
// AI Provider Types
// ==========================================================================

export interface AIRecommendation {
  title: string;
  year: number;
  type: ContentType;
  reason: string;
}

export interface AIProvider {
  name: string;
  isAvailable: () => Promise<boolean>;
  getRecommendations: (prompt: string) => Promise<AIRecommendation[]>;
}

export interface RecommendationResult {
  results: ContentWithReason[];
  provider: string;
  isFallback: boolean;
}

// ==========================================================================
// User Intent (for AI fallback)
// ==========================================================================

export interface UserIntent {
  genres: number[];
  mood: string | null;
  era: { start: number; end: number } | null;
  type: ContentType | null;
  similar: string | null;
  keywords: string[];
}
