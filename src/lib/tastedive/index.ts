// ==========================================================================
// TasteDive Library
// Similar content and blend recommendations via TasteDive API
// ==========================================================================

// Types
export type {
  TasteDiveResponse,
  TasteDiveResult,
  TasteDiveMatch,
  EnrichedTasteDiveResult,
  NormalizedType,
} from './types';

export { TASTEDIVE_CONFIG, tasteDiveCacheKeys } from './types';

// Client functions
export {
  getSimilar,
  getBlend,
  isTasteDiveAvailable,
  isTasteDiveRateLimited,
  getTasteDiveRemainingRequests,
  extractTitleMentions,
} from './client';

// Enrichment functions
export {
  enrichTasteDiveResults,
  getSimilarEnriched,
  getBlendEnriched,
} from './enrich';
