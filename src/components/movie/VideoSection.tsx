'use client';

// ==========================================================================
// Video Section Component
// Shows trailers and other videos from YouTube
// ==========================================================================

import { useState } from 'react';
import { Play, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Video } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface VideoSectionProps {
  videos: Video[];
  className?: string;
}

// ==========================================================================
// Video Section Component
// ==========================================================================

export function VideoSection({ videos, className = '' }: VideoSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  // Sort videos: Official Trailers first, then other trailers, then rest
  const sortedVideos = [...videos].sort((a, b) => {
    const getPriority = (v: Video) => {
      if (v.type === 'Trailer' && v.official) return 0;
      if (v.type === 'Trailer') return 1;
      if (v.type === 'Teaser' && v.official) return 2;
      if (v.type === 'Teaser') return 3;
      return 4;
    };
    return getPriority(a) - getPriority(b);
  });

  // Get only YouTube videos
  const youtubeVideos = sortedVideos.filter((v) => v.site === 'YouTube').slice(0, 6);

  if (youtubeVideos.length === 0) {
    return null;
  }

  return (
    <section id="trailers" className={className}>
      <h2 className="mb-4 text-xl font-semibold text-text-primary sm:mb-6 sm:text-2xl">
        Videos
      </h2>

      {/* Selected Video Player */}
      {selectedVideo && (
        <div className="mb-6">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.key}?autoplay=1`}
              title={selectedVideo.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
          <p className="mt-2 text-sm text-text-secondary">{selectedVideo.name}</p>
        </div>
      )}

      {/* Video Thumbnails */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {youtubeVideos.map((video) => (
          <VideoThumbnail
            key={video.id}
            video={video}
            isSelected={selectedVideo?.id === video.id}
            onClick={() => setSelectedVideo(video)}
          />
        ))}
      </div>
    </section>
  );
}

// ==========================================================================
// Video Thumbnail Component
// ==========================================================================

interface VideoThumbnailProps {
  video: Video;
  isSelected: boolean;
  onClick: () => void;
}

function VideoThumbnail({ video, isSelected, onClick }: VideoThumbnailProps) {
  const thumbnailUrl = `https://img.youtube.com/vi/${video.key}/mqdefault.jpg`;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative aspect-video w-full overflow-hidden rounded-lg text-left transition-all',
        isSelected
          ? 'ring-2 ring-accent-primary'
          : 'ring-1 ring-border-subtle hover:ring-border-default'
      )}
    >
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={thumbnailUrl}
        alt={video.name}
        className="h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 transition-opacity group-hover:bg-black/30" />

      {/* Play Button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary text-white transition-transform group-hover:scale-110">
          <Play className="h-5 w-5" fill="currentColor" />
        </div>
      </div>

      {/* Video Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="line-clamp-1 text-sm font-medium text-white">{video.name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-white/70">
          <span className="flex items-center gap-1">
            <Film className="h-3 w-3" />
            {video.type}
          </span>
          {video.official && (
            <span className="rounded bg-white/20 px-1.5 py-0.5">Official</span>
          )}
        </div>
      </div>
    </button>
  );
}
