// ==========================================================================
// Torrentio API Client
// Checks content availability via multiple Stremio addons with fallback
// Supports: Torrentio, Comet, MediaFusion, TorrentsDB, Knightcrawler
// ==========================================================================

import type {
  TorrentioStream,
  AvailabilityStatus,
} from './types';
import {
  QUALITY_PRIORITY,
  MIN_QUALITY_PRIORITY,
  EXCLUDED_SOURCES,
  VALID_SOURCES,
  LOW_QUALITY_PATTERNS,
  AUDIO_CODEC_PRIORITY,
  PREFERRED_AUDIO_CODECS,
  PREFERRED_VIDEO_CODECS,
} from './types';
import {
  getMovieStreamsWithFallback,
  getTVStreamsWithFallback,
} from './providers';

// ==========================================================================
// Helper Functions
// ==========================================================================
//
// A stream looks like:
//   name:  "Torrentio\n4k DV | HDR"          (addon, then its quality tag)
//   title: "Movie.2026.2160p.WEB-DL.DDP5.1.Atmos.DV.H.265-GRP\n👤 21 💾 10.4 GB ⚙️ Wolfmax4k\n🇬🇧"
// Only the tag and the first title line describe the file. The rest is
// seeders, size, tracker/uploader and languages — matching on all of it made
// an uploader named "Wolfmax4k" turn three 1080p/720p releases into "4K".

/** The addon's quality tag: the lines of `name` after the addon name. */
function qualityTag(stream: TorrentioStream): string {
  return (stream.name ?? '').split('\n').slice(1).join(' ').toUpperCase();
}

/** The release name: the first line of `title` (plus the file name, if given). */
function releaseName(stream: TorrentioStream): string {
  const first = (stream.title ?? '').split('\n')[0] ?? '';
  return `${first} ${stream.behaviorHints?.filename ?? ''}`.toUpperCase();
}

/** Text that describes the file itself (tag + release name, no tracker). */
function describedText(stream: TorrentioStream): string {
  return `${qualityTag(stream)} ${releaseName(stream)}`;
}

const UHD = /\b(2160P|4K|UHD)\b/;

/**
 * Resolution of a stream. The addon's tag wins; otherwise the release name,
 * where a stated 1080p/720p beats "UHD" (a UHD source encoded at 1080p).
 */
function extractQuality(stream: TorrentioStream): string | null {
  const tag = qualityTag(stream);
  if (UHD.test(tag)) return '2160p';
  if (/\b1080P\b/.test(tag)) return '1080p';
  if (/\b720P\b/.test(tag)) return '720p';
  if (/\b480P\b/.test(tag)) return '480p';

  const name = releaseName(stream);
  if (/\b1080P\b/.test(name)) return '1080p';
  if (/\b720P\b/.test(name)) return '720p';
  if (/\b480P\b/.test(name)) return '480p';
  if (UHD.test(name)) return '2160p';

  return null;
}

/**
 * Whether the release name names a different film's year. Addons sometimes
 * return other titles for an IMDb ID (e.g. "Shades of the Heart 2021" for a
 * 2026 film); a release whose years are all more than a year off is one.
 */
function isOtherYear(stream: TorrentioStream, year: number | undefined): boolean {
  if (!year) return false;
  const years = releaseName(stream).match(/\b(19|20)\d{2}\b/g);
  if (!years) return false;
  return !years.some((y) => Math.abs(Number(y) - year) <= 1);
}

/**
 * Extract source type from the release name
 */
function extractSource(stream: TorrentioStream): string | null {
  const text = releaseName(stream);

  // Check for valid sources
  for (const source of VALID_SOURCES) {
    if (text.includes(source.toUpperCase())) {
      return source;
    }
  }

  return null;
}

/**
 * Check if stream is from a low-quality source (CAM, TS, etc.)
 * Uses multiple detection methods for better accuracy
 */
function isLowQualitySource(stream: TorrentioStream): boolean {
  // Torrentio tags early releases itself ("CAM", "TeleSync", "SCR")
  if (/\b(CAM|TELESYNC|TELECINE|TS|TC|SCR|SCREENER)\b/.test(qualityTag(stream))) {
    return true;
  }

  const text = describedText(stream);

  // Check for excluded sources with word boundaries
  for (const excluded of EXCLUDED_SOURCES) {
    const pattern = new RegExp(`\\b${excluded}\\b`, 'i');
    if (pattern.test(text)) {
      return true;
    }
  }

  // Check for low quality patterns (substring match)
  for (const pattern of LOW_QUALITY_PATTERNS) {
    if (text.includes(pattern.toUpperCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Check if stream has a confirmed valid/high-quality source
 * This is stricter - the stream must explicitly contain a valid source indicator
 */
function hasValidSource(stream: TorrentioStream): boolean {
  const text = releaseName(stream);

  for (const source of VALID_SOURCES) {
    // Use word boundary for more accurate matching
    const pattern = new RegExp(`\\b${source.toUpperCase()}\\b`);
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract audio codec from stream title
 */
function extractAudioCodec(stream: TorrentioStream): string | null {
  const text = describedText(stream);

  // Check for audio codecs in priority order (highest first)
  const sortedCodecs = [...PREFERRED_AUDIO_CODECS].sort((a, b) => {
    const priorityA = AUDIO_CODEC_PRIORITY[a] ?? 0;
    const priorityB = AUDIO_CODEC_PRIORITY[b] ?? 0;
    return priorityB - priorityA;
  });

  for (const codec of sortedCodecs) {
    // Handle special cases with dots and dashes
    const patterns = [
      codec.toUpperCase(),
      codec.toUpperCase().replace(/[.-]/g, ''),  // Remove dots/dashes
      codec.toUpperCase().replace(/[.-]/g, ' '), // Replace with space
    ];

    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        return codec;
      }
    }
  }

  return null;
}

/**
 * Extract video codec from stream title
 */
function extractVideoCodec(stream: TorrentioStream): string | null {
  const text = describedText(stream);

  for (const codec of PREFERRED_VIDEO_CODECS) {
    const pattern = new RegExp(`\\b${codec.toUpperCase().replace(/[.-]/g, '[.-]?')}\\b`);
    if (pattern.test(text)) {
      return codec;
    }
  }

  return null;
}

/**
 * Check if stream is 4K/2160p quality
 */
function is4KQuality(stream: TorrentioStream): boolean {
  return extractQuality(stream) === '2160p';
}

/**
 * Check if stream has HDR (HDR10, HDR10+, Dolby Vision). Whole words only:
 * "HDRip" is a rip, not HDR, and "DV" must not match DVD or a tracker name.
 */
function hasHDR(stream: TorrentioStream): boolean {
  return /\b(HDR|HDR10\+?|DV|DOVI|DOLBY[ .]?VISION)\b/.test(describedText(stream));
}

/**
 * Check if stream has high-quality audio (Atmos, DTS-HD, TrueHD, etc.)
 */
function hasHighQualityAudio(stream: TorrentioStream): boolean {
  const codec = extractAudioCodec(stream);
  if (!codec) return false;

  const priority = AUDIO_CODEC_PRIORITY[codec] ?? 0;
  return priority >= 5; // AC3/DD5.1 or better
}

/**
 * Get the best quality from a list of qualities
 */
function getBestQuality(qualities: string[]): string | null {
  if (qualities.length === 0) return null;

  return qualities.sort((a, b) => {
    const priorityA = QUALITY_PRIORITY[a] ?? 0;
    const priorityB = QUALITY_PRIORITY[b] ?? 0;
    return priorityB - priorityA;
  })[0] ?? null;
}

// ==========================================================================
// API Functions
// ==========================================================================

/**
 * Check availability for a movie by IMDB ID
 * Uses multiple providers with automatic fallback
 */
export async function checkMovieAvailability(
  imdbId: string,
  /** The film's release year: releases naming another year are ignored */
  year?: number
): Promise<AvailabilityStatus> {
  try {
    const { streams, provider, checked } = await getMovieStreamsWithFallback(imdbId);

    if (streams.length === 0) {
      return {
        available: false,
        streamCount: 0,
        bestQuality: null,
        sources: [],
        audioCodec: null,
        videoCodec: null,
        hasHDR: false,
        ...(!checked && { checkFailed: true }),
      };
    }

    const availability = parseStreamsToAvailability(streams, year);

    // Log which provider succeeded (for debugging)
    if (availability.available && provider !== 'none') {
      console.debug(`Movie ${imdbId} availability from: ${provider}`);
    }

    return availability;
  } catch (error) {
    console.error(`All providers failed for movie ${imdbId}:`, error);
    return {
      available: false,
      streamCount: 0,
      bestQuality: null,
      sources: [],
      audioCodec: null,
      videoCodec: null,
      hasHDR: false,
      checkFailed: true,
    };
  }
}

/**
 * Check availability for a TV show episode by IMDB ID
 * Uses multiple providers with automatic fallback
 */
export async function checkTVAvailability(
  imdbId: string,
  season: number = 1,
  episode: number = 1
): Promise<AvailabilityStatus> {
  try {
    const { streams, provider, checked } = await getTVStreamsWithFallback(imdbId, season, episode);

    if (streams.length === 0) {
      return {
        available: false,
        streamCount: 0,
        bestQuality: null,
        sources: [],
        audioCodec: null,
        videoCodec: null,
        hasHDR: false,
        ...(!checked && { checkFailed: true }),
      };
    }

    const availability = parseStreamsToAvailability(streams);

    if (availability.available && provider !== 'none') {
      console.debug(`TV ${imdbId}:${season}:${episode} availability from: ${provider}`);
    }

    return availability;
  } catch (error) {
    console.error(`All providers failed for TV ${imdbId}:${season}:${episode}:`, error);
    return {
      available: false,
      streamCount: 0,
      bestQuality: null,
      sources: [],
      audioCodec: null,
      videoCodec: null,
      hasHDR: false,
      checkFailed: true,
    };
  }
}

/**
 * Parse streams into availability status
 * ULTRA-STRICT filtering for premium quality only:
 * - Requires 2160p/4K resolution
 * - Requires high-quality audio (Atmos, DTS-HD, TrueHD, etc.)
 * - Requires confirmed valid source (WEB-DL, BluRay, Remux)
 * - Filters out all low-quality sources (CAM, TS, etc.)
 */
function parseStreamsToAvailability(streams: TorrentioStream[], year?: number): AvailabilityStatus {
  const unavailable: AvailabilityStatus = {
    available: false,
    streamCount: 0,
    bestQuality: null,
    sources: [],
    audioCodec: null,
    videoCodec: null,
    hasHDR: false,
  };

  if (!streams || streams.length === 0) {
    return unavailable;
  }

  // Step 1: Filter out streams that are explicitly low quality (CAM, TS, etc.)
  // or that are another film altogether
  const nonLowQualityStreams = streams.filter(
    (stream) => !isLowQualitySource(stream) && !isOtherYear(stream, year)
  );

  if (nonLowQualityStreams.length === 0) {
    return unavailable;
  }

  // Step 2: Filter to only 4K/2160p streams
  const fourKStreams = nonLowQualityStreams.filter((stream) => is4KQuality(stream));

  if (fourKStreams.length === 0) {
    // No 4K content available - not acceptable
    return unavailable;
  }

  // Step 3: From 4K streams, find those with CONFIRMED valid sources
  const confirmedValidStreams = fourKStreams.filter((stream) => hasValidSource(stream));

  if (confirmedValidStreams.length === 0) {
    return unavailable;
  }

  // Step 4: Prefer streams with high-quality audio
  const highQualityAudioStreams = confirmedValidStreams.filter((stream) => hasHighQualityAudio(stream));

  // Use high-quality audio streams if available, otherwise use all confirmed valid streams
  const finalStreams = highQualityAudioStreams.length > 0 ? highQualityAudioStreams : confirmedValidStreams;

  // Extract information from final streams
  const qualities: string[] = [];
  const sources = new Set<string>();
  let bestAudioCodec: string | null = null;
  let bestAudioPriority = 0;
  let bestVideoCodec: string | null = null;
  let streamHasHDR = false;

  for (const stream of finalStreams) {
    const quality = extractQuality(stream);
    if (quality) qualities.push(quality);

    const source = extractSource(stream);
    if (source) sources.add(source);

    const audioCodec = extractAudioCodec(stream);
    if (audioCodec) {
      const priority = AUDIO_CODEC_PRIORITY[audioCodec] ?? 0;
      if (priority > bestAudioPriority) {
        bestAudioPriority = priority;
        bestAudioCodec = audioCodec;
      }
    }

    const videoCodec = extractVideoCodec(stream);
    if (videoCodec && !bestVideoCodec) {
      bestVideoCodec = videoCodec;
    }

    if (hasHDR(stream)) {
      streamHasHDR = true;
    }
  }

  // Require at least one confirmed valid source
  if (sources.size === 0) {
    return unavailable;
  }

  const bestQuality = getBestQuality(qualities);
  const qualityPriority = bestQuality ? (QUALITY_PRIORITY[bestQuality] ?? 0) : 0;

  // STRICT: Require 4K quality (priority 5)
  if (qualityPriority < MIN_QUALITY_PRIORITY) {
    return unavailable;
  }

  return {
    available: true,
    streamCount: finalStreams.length,
    bestQuality,
    sources: Array.from(sources),
    audioCodec: bestAudioCodec,
    videoCodec: bestVideoCodec,
    hasHDR: streamHasHDR,
  };
}

/**
 * Batch check availability for multiple movies
 * Returns a map of IMDB ID to availability status
 */
export async function checkMultipleMoviesAvailability(
  imdbIds: string[]
): Promise<Map<string, AvailabilityStatus>> {
  const results = new Map<string, AvailabilityStatus>();

  // Process in parallel with concurrency limit
  const CONCURRENCY = 5;
  const chunks: string[][] = [];

  for (let i = 0; i < imdbIds.length; i += CONCURRENCY) {
    chunks.push(imdbIds.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (imdbId) => {
        const availability = await checkMovieAvailability(imdbId);
        return { imdbId, availability };
      })
    );

    for (const { imdbId, availability } of chunkResults) {
      results.set(imdbId, availability);
    }
  }

  return results;
}

/**
 * Batch check availability for multiple TV shows
 */
export async function checkMultipleTVAvailability(
  items: Array<{ imdbId: string; season?: number; episode?: number }>
): Promise<Map<string, AvailabilityStatus>> {
  const results = new Map<string, AvailabilityStatus>();

  const CONCURRENCY = 5;
  const chunks: typeof items[] = [];

  for (let i = 0; i < items.length; i += CONCURRENCY) {
    chunks.push(items.slice(i, i + CONCURRENCY));
  }

  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        const availability = await checkTVAvailability(
          item.imdbId,
          item.season ?? 1,
          item.episode ?? 1
        );
        return { imdbId: item.imdbId, availability };
      })
    );

    for (const { imdbId, availability } of chunkResults) {
      results.set(imdbId, availability);
    }
  }

  return results;
}
