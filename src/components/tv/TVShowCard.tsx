'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Heart } from 'lucide-react';
import { EpisodeProgressBar, EpisodeStatusBadge, NextEpisodeInfo } from './EpisodeProgressBar';
import { ContentPoster } from '@/components/content/ContentPoster';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { TMDB_IMAGE_BASE_URL } from '@/lib/constants';
import type { TVShow, EpisodeStatus } from '@/types';

// Helper to get poster URL with specific size
function getPosterUrlWithSize(path: string | null, size: string): string {
  if (!path) return '/placeholder-poster.png';
  return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;
}

// ==========================================================================
// TV Show Card with Episode Progress
// ==========================================================================

interface TVShowWithStatus extends TVShow {
  episode_status: EpisodeStatus;
  current_season: number;
}

interface TVShowCardProps {
  show: TVShowWithStatus;
  priority?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (show: TVShowWithStatus) => void;
  className?: string;
}

export function TVShowCard({
  show,
  priority = false,
  isInWatchlist = false,
  onWatchlistToggle,
  className = '',
}: TVShowCardProps) {
  const router = useRouter();
  const similarUrl = `/similar/tv/${show.id}`;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatchlistToggle?.(show);
  };

  const handleSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(similarUrl);
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary',
        'transition-all duration-200 hover:border-border-default hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      <Link href={`/tv/${show.id}`} className="block">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <ContentPoster
            path={show.poster_path}
            alt={show.name}
            size="medium"
            priority={priority}
            fill
            className="transition-transform duration-300 group-hover:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

          {/* Quick Actions (visible on hover) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {/* Find Similar Button */}
            <Tooltip content="Find Similar" position="top">
              <button
                onClick={handleSimilarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-accent-primary"
                aria-label="Find similar shows"
              >
                <Plus className="h-5 w-5" />
              </button>
            </Tooltip>

            {/* Watchlist Button */}
            <Tooltip content={isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'} position="top">
              <button
                onClick={handleWatchlistClick}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  isInWatchlist
                    ? 'bg-accent-primary text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
                aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <Heart className={cn('h-5 w-5', isInWatchlist && 'fill-current')} />
              </button>
            </Tooltip>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <EpisodeStatusBadge status={show.episode_status} showStatus={show.status} size="sm" />
          </div>
        </div>

        {/* Content Info */}
        <div className="p-2">
          <h3 className="truncate text-[13px] font-medium text-text-primary group-hover:text-accent-primary">
            {show.name}
          </h3>
          <p className="mt-0.5 text-[11px] text-text-tertiary">
            Season {show.current_season}
          </p>

          {/* Episode Progress */}
          <div className="mt-3">
            <EpisodeProgressBar status={show.episode_status} size="sm" />
          </div>

          {/* Next Episode */}
          <div className="mt-2 pt-2 border-t border-border-subtle">
            <NextEpisodeInfo status={show.episode_status} />
          </div>
        </div>
      </Link>
    </article>
  );
}

// ==========================================================================
// Compact TV Show Card (for horizontal rows)
// ==========================================================================

interface CompactTVShowCardProps {
  show: TVShowWithStatus;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (show: TVShowWithStatus) => void;
  className?: string;
}

export function CompactTVShowCard({
  show,
  isInWatchlist = false,
  onWatchlistToggle,
  className = '',
}: CompactTVShowCardProps) {
  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatchlistToggle?.(show);
  };

  return (
    <Link
      href={`/tv/${show.id}`}
      className={cn(
        'flex gap-4 rounded-lg bg-bg-secondary p-4 transition-colors hover:bg-bg-tertiary',
        className
      )}
    >
      {/* Poster */}
      <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded">
        <Image
          src={getPosterUrlWithSize(show.poster_path, 'w92')}
          alt={show.name}
          fill
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-[13px] font-medium text-text-primary truncate">{show.name}</h3>
            <p className="text-[11px] text-text-tertiary">Season {show.current_season}</p>
          </div>
          <EpisodeStatusBadge status={show.episode_status} showStatus={show.status} size="sm" />
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <EpisodeProgressBar status={show.episode_status} size="sm" />
        </div>

        {/* Next Episode */}
        <div className="mt-2">
          <NextEpisodeInfo status={show.episode_status} />
        </div>
      </div>
    </Link>
  );
}
