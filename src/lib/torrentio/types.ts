// ==========================================================================
// Torrentio Types
// Types for Torrentio API responses
// ==========================================================================

/**
 * A single stream from Torrentio
 */
export interface TorrentioStream {
  name: string; // e.g., "Torrentio\n1080p"
  title: string; // Detailed info: "[RD+] Movie.Name.2024.1080p.WEB-DL..."
  url?: string; // Magnet or debrid link
  infoHash?: string; // Torrent info hash
  fileIdx?: number; // File index in torrent
  behaviorHints?: {
    bingeGroup?: string;
    filename?: string;
  };
}

/**
 * Response from Torrentio stream endpoint
 */
export interface TorrentioResponse {
  streams: TorrentioStream[];
}

/**
 * Availability status for content
 */
export interface AvailabilityStatus {
  available: boolean;
  streamCount: number;
  bestQuality: string | null; // e.g., "2160p", "4K"
  sources: string[]; // e.g., ["WEB-DL", "BluRay", "Remux"]
  audioCodec: string | null; // e.g., "ATMOS", "DTS-HD", "TrueHD"
  videoCodec: string | null; // e.g., "HEVC", "x265", "H.265"
  hasHDR: boolean; // HDR10, HDR10+, Dolby Vision
}

// Note: ContentWithAvailability is defined in availability.ts
// as it extends Movie/TVShow types from the main types module

/**
 * Quality priority (higher = better)
 * Only 2160p/4K is accepted for "Just Released" section
 */
export const QUALITY_PRIORITY: Record<string, number> = {
  '2160p': 5,
  '4K': 5,
  '1080p': 3,  // Not accepted for Just Released
  '720p': 2,   // Not accepted
  '480p': 1,   // Not accepted
  'CAM': 0,
  'TS': 0,
  'HDTS': 0,
  'HDTC': 0,
  'SCR': 0,
  'DVDSCR': 0,
};

/**
 * Minimum quality priority required (2160p/4K = 5)
 */
export const MIN_QUALITY_PRIORITY = 5;

/**
 * High-quality audio codecs (priority order - higher is better)
 */
export const AUDIO_CODEC_PRIORITY: Record<string, number> = {
  // Lossless / Object-based (highest)
  'ATMOS': 10,
  'TRUEHD': 9,
  'TRUEHD.ATMOS': 10,
  'DTS-HD': 8,
  'DTS-HD.MA': 9,
  'DTS:X': 9,
  'LPCM': 8,
  'FLAC': 8,

  // High quality lossy
  'DTS': 6,
  'DD+': 6,
  'DDP': 6,
  'EAC3': 6,
  'E-AC3': 6,
  'AC3': 5,
  'DD5.1': 5,
  'DD7.1': 6,
  'AAC': 4,

  // Low quality
  'MP3': 2,
  'OPUS': 3,
};

/**
 * High-quality audio codecs that we prefer
 */
export const PREFERRED_AUDIO_CODECS = [
  'ATMOS',
  'TRUEHD',
  'DTS-HD',
  'DTS-HD.MA',
  'DTS:X',
  'LPCM',
  'FLAC',
  'DTS',
  'DD+',
  'DDP',
  'EAC3',
  'E-AC3',
  'DD7.1',
  'DD5.1',
  'AC3',
];

/**
 * High-quality video codecs
 */
export const PREFERRED_VIDEO_CODECS = [
  'HEVC',
  'H.265',
  'H265',
  'x265',
  'HDR',
  'HDR10',
  'HDR10+',
  'DOLBY.VISION',
  'DV',
  'H.264',
  'H264',
  'x264',
  'AVC',
];

/**
 * Source types we consider "released" (not CAM/TS)
 */
export const VALID_SOURCES = [
  'WEB-DL',
  'WEBRip',
  'WEBDL',
  'WEB',
  'BluRay',
  'BDRip',
  'BRRip',
  'HDRip',
  'HDTV',
  'DVDRip',
  'Remux',
];

/**
 * Source types we want to exclude (low quality/early releases)
 */
export const EXCLUDED_SOURCES = [
  'CAM',
  'HDCAM',
  'CAMRip',
  'TS',
  'HDTS',
  'TELESYNC',
  'TC',
  'HDTC',
  'TELECINE',
  'SCR',
  'DVDSCR',
  'SCREENER',
  'R5',
  'R6',
  'PDVD',
  'PreDVD',
  'PPVRip',
  'KORSUB',  // Often indicates CAM with Korean subs
  'HC',      // Hardcoded subs (often CAM indicator)
  'HCHDRip', // Hardcoded HDRip (usually CAM)
];

/**
 * Additional patterns that indicate low quality releases
 * These are checked as substrings in the title
 */
export const LOW_QUALITY_PATTERNS = [
  'CAM',
  'CAMRIP',
  'HDCAM',
  'TELESYNC',
  'TELECINE',
  'HDTS',
  'PDVD',
  'PREDVD',
  'HC-',     // Hardcoded prefix
  '-HC',     // Hardcoded suffix
  '.HC.',    // Hardcoded in middle
  'KORSUB',
  'HARDCODED',
  'HDRIP-HC',
  'V1-CAM',
  'V2-CAM',
  'V3-CAM',
  'NEWCAM',
  'CLEAN.CAM',
  'CLEAN-CAM',
  'PROPER.CAM',
];
