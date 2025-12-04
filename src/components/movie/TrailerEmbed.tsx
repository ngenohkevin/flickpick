'use client';

// ==========================================================================
// Trailer Embed Component
// Shows a single best trailer (official trailer > teaser > nothing)
// With optional pre-roll ad support
// ==========================================================================

import { useState, useEffect, useCallback } from 'react';
import { Play, X } from 'lucide-react';
import { getBestTrailer } from '@/lib/video-utils';
import { shouldShowPrerollAds, adProvider } from '@/lib/ads';
import { AdPlayer } from '@/components/ads';
import type { Video } from '@/types';
import type { Ad } from '@/lib/ads/types';

// ==========================================================================
// Types
// ==========================================================================

interface TrailerEmbedProps {
  videos: Video[];
  title: string;
  posterPath?: string | null;
  className?: string;
  /** Content type for ad targeting */
  contentType?: 'movie' | 'tv' | 'anime' | 'animation';
  /** Genre IDs for ad targeting */
  genreIds?: number[];
  /** Content ID for ad targeting */
  contentId?: number;
}

type PlayerState = 'idle' | 'loading_ad' | 'showing_ad' | 'playing_trailer';

// ==========================================================================
// Trailer Embed Component
// ==========================================================================

export function TrailerEmbed({
  videos,
  title,
  posterPath,
  className = '',
  contentType,
  genreIds,
  contentId,
}: TrailerEmbedProps) {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentAd, setCurrentAd] = useState<Ad | null>(null);
  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  const trailer = getBestTrailer(videos);
  const posterUrl = posterPath ? `https://image.tmdb.org/t/p/w780${posterPath}` : null;

  // Try to load YouTube thumbnail, fall back to poster if it fails or shows placeholder
  useEffect(() => {
    if (!trailer) return;

    const youtubeThumb = `https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`;

    // Check if the YouTube thumbnail is a valid image (not the gray placeholder)
    const img = new Image();
    img.onload = () => {
      // YouTube's gray placeholder is 120x90, real thumbnails are larger
      // hqdefault is 480x360 when available
      if (img.naturalWidth > 200) {
        setThumbnailSrc(youtubeThumb);
      } else if (posterUrl) {
        setThumbnailSrc(posterUrl);
      }
    };
    img.onerror = () => {
      if (posterUrl) {
        setThumbnailSrc(posterUrl);
      }
    };
    img.src = youtubeThumb;

    // Default to poster while checking
    if (posterUrl) {
      setThumbnailSrc(posterUrl);
    }
  }, [trailer, posterUrl]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handlePlayClick = useCallback(async () => {
    // Check if we should show a pre-roll ad
    if (shouldShowPrerollAds()) {
      setPlayerState('loading_ad');

      try {
        // Request an ad
        const response = await adProvider.requestAd({
          placement: 'trailer_preroll',
          contentType,
          genreIds,
          contentId,
        });

        if (response.ad) {
          setCurrentAd(response.ad);
          setPlayerState('showing_ad');
          return;
        }
      } catch (error) {
        console.error('[TrailerEmbed] Ad request failed:', error);
        // Continue to trailer on error
      }
    }

    // No ad to show, play trailer directly
    setPlayerState('playing_trailer');
  }, [contentType, genreIds, contentId]);

  const handleAdComplete = useCallback(() => {
    setCurrentAd(null);
    setPlayerState('playing_trailer');
  }, []);

  const handleClose = useCallback(() => {
    setPlayerState('idle');
    setCurrentAd(null);
  }, []);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (!trailer) return null;

  return (
    <section id="trailer" className={className}>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Trailer
        </h2>
        {trailer.official && (
          <span className="text-xs font-medium text-text-tertiary bg-bg-tertiary px-2 py-1 rounded">
            Official
          </span>
        )}
      </div>

      <div className="relative aspect-video overflow-hidden rounded-xl bg-bg-secondary">
        {/* Loading Ad State */}
        {playerState === 'loading_ad' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <span className="text-sm text-white/60">Loading...</span>
            </div>
          </div>
        )}

        {/* Pre-roll Ad */}
        {playerState === 'showing_ad' && currentAd && (
          <AdPlayer
            ad={currentAd}
            onAdComplete={handleAdComplete}
            onAdError={(error) => {
              console.error('[TrailerEmbed] Ad error:', error);
              handleAdComplete();
            }}
          />
        )}

        {/* Trailer Player */}
        {playerState === 'playing_trailer' && (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
              title={`${title} - ${trailer.name}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Close trailer"
            >
              <X className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Idle State - Thumbnail */}
        {playerState === 'idle' && (
          <button
            onClick={handlePlayClick}
            className="group relative w-full h-full"
            aria-label={`Play trailer for ${title}`}
          >
            {/* Thumbnail - uses poster as default, YouTube thumbnail if available */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailSrc || posterUrl || ''}
              alt={`${title} trailer thumbnail`}
              className="h-full w-full object-cover"
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/30 transition-opacity group-hover:bg-black/20" />

            {/* Play Button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-accent-primary/90 text-white shadow-lg transition-transform group-hover:scale-110 group-hover:bg-accent-primary">
                <Play className="h-6 w-6 sm:h-7 sm:w-7 ml-1" fill="currentColor" />
              </div>
            </div>

            {/* Video Title */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-4">
              <p className="text-sm font-medium text-white line-clamp-1">
                {trailer.name}
              </p>
            </div>
          </button>
        )}
      </div>
    </section>
  );
}
