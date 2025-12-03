'use client';

// ==========================================================================
// Trailer Embed Component
// Shows a single best trailer (official trailer > teaser > nothing)
// ==========================================================================

import { useState, useEffect } from 'react';
import { Play, X } from 'lucide-react';
import { getBestTrailer } from '@/lib/video-utils';
import type { Video } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface TrailerEmbedProps {
  videos: Video[];
  title: string;
  posterPath?: string | null;
  className?: string;
}

// ==========================================================================
// Trailer Embed Component
// ==========================================================================

export function TrailerEmbed({ videos, title, posterPath, className = '' }: TrailerEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);
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
          {isPlaying ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`}
                title={`${title} - ${trailer.name}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
              <button
                onClick={() => setIsPlaying(false)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Close trailer"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
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

