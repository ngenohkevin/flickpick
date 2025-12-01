'use client';

import Image from 'next/image';
import { Check, Clock, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TMDB_IMAGE_BASE_URL, BACKDROP_SIZES } from '@/lib/constants';
import type { Episode } from '@/types';

// Helper to get backdrop URL with specific sizes
function getBackdropUrlWithSize(path: string | null, size: string): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

// ==========================================================================
// Episode List Component
// Table view of episodes with release status
// ==========================================================================

interface EpisodeWithStatus extends Episode {
  is_released: boolean;
  days_until: number | null;
}

interface EpisodeListProps {
  episodes: EpisodeWithStatus[];
  showName?: string;
  className?: string;
}

export function EpisodeList({ episodes, showName, className = '' }: EpisodeListProps) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border-subtle', className)}>
      <table className="w-full">
        <thead>
          <tr className="bg-bg-tertiary text-left text-xs font-medium uppercase text-text-tertiary">
            <th className="px-4 py-3 w-20">Episode</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3 w-32 hidden sm:table-cell">Air Date</th>
            <th className="px-4 py-3 w-24 hidden md:table-cell">Runtime</th>
            <th className="px-4 py-3 w-28">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {episodes.map((episode) => (
            <EpisodeRow key={episode.id} episode={episode} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==========================================================================
// Episode Row Component
// ==========================================================================

interface EpisodeRowProps {
  episode: EpisodeWithStatus;
}

function EpisodeRow({ episode }: EpisodeRowProps) {
  const airDate = episode.air_date ? new Date(episode.air_date) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRuntime = (minutes: number | null) => {
    if (!minutes) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <tr className="bg-bg-secondary hover:bg-bg-tertiary transition-colors">
      {/* Episode Number */}
      <td className="px-4 py-3">
        <span className="font-mono text-sm text-text-primary">
          S{episode.season_number}E{episode.episode_number}
        </span>
      </td>

      {/* Title */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Thumbnail */}
          {episode.still_path && (
            <div className="relative h-10 w-16 flex-shrink-0 overflow-hidden rounded hidden lg:block">
              <Image
                src={getBackdropUrlWithSize(episode.still_path, 'w300') ?? ''}
                alt={episode.name}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-text-primary truncate">{episode.name}</p>
            {episode.overview && (
              <p className="text-xs text-text-tertiary line-clamp-1 hidden sm:block">
                {episode.overview}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Air Date */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <span className="text-sm text-text-secondary">
          {airDate ? formatDate(airDate) : 'TBA'}
        </span>
      </td>

      {/* Runtime */}
      <td className="px-4 py-3 hidden md:table-cell">
        <span className="text-sm text-text-secondary">
          {formatRuntime(episode.runtime)}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <EpisodeStatusIndicator
          isReleased={episode.is_released}
          daysUntil={episode.days_until}
        />
      </td>
    </tr>
  );
}

// ==========================================================================
// Episode Status Indicator
// ==========================================================================

interface EpisodeStatusIndicatorProps {
  isReleased: boolean;
  daysUntil: number | null;
}

function EpisodeStatusIndicator({ isReleased, daysUntil }: EpisodeStatusIndicatorProps) {
  if (isReleased) {
    return (
      <span className="inline-flex items-center gap-1.5 text-success text-sm">
        <Check className="w-4 h-4" />
        <span className="hidden sm:inline">Released</span>
      </span>
    );
  }

  if (daysUntil === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-tertiary text-sm">
        <Calendar className="w-4 h-4" />
        <span className="hidden sm:inline">TBA</span>
      </span>
    );
  }

  if (daysUntil === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning text-sm font-medium">
        <Clock className="w-4 h-4" />
        <span>Today</span>
      </span>
    );
  }

  if (daysUntil === 1) {
    return (
      <span className="inline-flex items-center gap-1.5 text-warning text-sm">
        <Clock className="w-4 h-4" />
        <span>Tomorrow</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-text-secondary text-sm">
      <Clock className="w-4 h-4" />
      <span className="hidden sm:inline">In {daysUntil}d</span>
      <span className="sm:hidden">{daysUntil}d</span>
    </span>
  );
}

// ==========================================================================
// Episode Card Component (for grid/card view)
// ==========================================================================

interface EpisodeCardProps {
  episode: EpisodeWithStatus;
  className?: string;
}

export function EpisodeCard({ episode, className = '' }: EpisodeCardProps) {
  const airDate = episode.air_date ? new Date(episode.air_date) : null;

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary',
        'transition-all duration-200 hover:border-border-default',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-bg-tertiary">
        {episode.still_path ? (
          <Image
            src={getBackdropUrlWithSize(episode.still_path, 'w500') ?? ''}
            alt={episode.name}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-text-tertiary">
            No Image
          </div>
        )}

        {/* Episode number badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/70 text-white text-xs font-medium">
          S{episode.season_number}E{episode.episode_number}
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs font-medium',
              episode.is_released
                ? 'bg-success/90 text-white'
                : 'bg-warning/90 text-black'
            )}
          >
            {episode.is_released ? 'Released' : episode.days_until === 0 ? 'Today' : `In ${episode.days_until}d`}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h4 className="font-medium text-text-primary line-clamp-1">{episode.name}</h4>
        {airDate && (
          <p className="text-xs text-text-tertiary mt-1">
            {airDate.toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        )}
        {episode.overview && (
          <p className="text-xs text-text-secondary mt-2 line-clamp-2">
            {episode.overview}
          </p>
        )}
      </div>
    </div>
  );
}
