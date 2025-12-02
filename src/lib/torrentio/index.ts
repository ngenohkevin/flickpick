// ==========================================================================
// Torrentio Library - Main Export
// Provides content availability checking via multiple Stremio addons
// Supports: Torrentio, Comet, MediaFusion, TorrentsDB, Knightcrawler
// ==========================================================================

// Types (exclude ContentWithAvailability which is re-exported from availability.ts)
export type {
  TorrentioStream,
  TorrentioResponse,
  AvailabilityStatus,
} from './types';
export { QUALITY_PRIORITY, VALID_SOURCES, EXCLUDED_SOURCES } from './types';

// Provider types and functions
export type { StreamProvider } from './providers';
export {
  ALL_PROVIDERS,
  TorrentioProvider,
  CometProvider,
  MediaFusionProvider,
  TorrentsDBProvider,
  KnightcrawlerProvider,
  getMovieStreamsWithFallback,
  getTVStreamsWithFallback,
  checkProvidersHealth,
} from './providers';

// Client functions (uses provider chain internally)
export {
  checkMovieAvailability,
  checkTVAvailability,
  checkMultipleMoviesAvailability,
  checkMultipleTVAvailability,
} from './client';

// Availability checking (combines TMDB + stream providers)
export {
  getMovieExternalIds,
  getTVExternalIds,
  getMovieWithAvailability,
  getTVShowWithAvailability,
  getTVShowWithLatestEpisode,
  filterAvailableMovies,
  filterAvailableTVShows,
  filterJustReleasedTVShows,
  getJustReleasedMovies,
  getAvailableContent,
  type MovieWithAvailability,
  type TVShowWithAvailability,
  type ContentWithAvailability,
} from './availability';
