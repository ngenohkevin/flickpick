// ==========================================================================
// Video Utilities
// Helper functions for working with video data
// ==========================================================================

import type { Video } from '@/types';

/**
 * Get the best trailer from a list of videos
 * Priority: Official Trailer > Trailer > Official Teaser > Teaser
 */
export function getBestTrailer(videos: Video[]): Video | null {
  // Filter to YouTube videos only
  const youtubeVideos = videos.filter((v) => v.site === 'YouTube');

  if (youtubeVideos.length === 0) return null;

  // Priority: Official Trailer > Trailer > Official Teaser > Teaser
  const officialTrailer = youtubeVideos.find((v) => v.type === 'Trailer' && v.official);
  if (officialTrailer) return officialTrailer;

  const trailer = youtubeVideos.find((v) => v.type === 'Trailer');
  if (trailer) return trailer;

  const officialTeaser = youtubeVideos.find((v) => v.type === 'Teaser' && v.official);
  if (officialTeaser) return officialTeaser;

  const teaser = youtubeVideos.find((v) => v.type === 'Teaser');
  if (teaser) return teaser;

  return null;
}

/**
 * Check if there's a valid trailer available
 */
export function hasTrailer(videos: Video[]): boolean {
  return getBestTrailer(videos) !== null;
}
