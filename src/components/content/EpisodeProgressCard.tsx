'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Check, Clock } from 'lucide-react';
import { cn, getPosterUrl, formatDate } from '@/lib/utils';
import type { TVShow, EpisodeStatus } from '@/types';

// ==========================================================================
// Episode Progress Card Component
// Displays TV show with episode progress bar for the homepage
// ==========================================================================

export interface TVShowWithEpisodeStatus extends TVShow {
  episode_status: EpisodeStatus;
  current_season: number;
}

interface EpisodeProgressCardProps {
  show: TVShowWithEpisodeStatus;
  className?: string;
}

export function EpisodeProgressCard({ show, className }: EpisodeProgressCardProps) {
  const { episode_status } = show;
  const progressPercent = episode_status.total > 0
    ? (episode_status.released / episode_status.total) * 100
    : 0;

  // Format next episode date
  const nextEpisodeText = episode_status.nextEpisode?.air_date
    ? formatDate(episode_status.nextEpisode.air_date, { month: 'short', day: 'numeric' })
    : null;

  // Format episode identifier (e.g., "S2E5")
  const nextEpisodeId = episode_status.nextEpisode
    ? `S${episode_status.nextEpisode.season_number}E${episode_status.nextEpisode.episode_number}`
    : null;

  return (
    <Link
      href={`/tv/${show.id}`}
      className={cn(
        'group flex gap-3 rounded-lg bg-bg-secondary p-3 transition-colors hover:bg-bg-tertiary',
        'border border-border-subtle hover:border-border-default',
        className
      )}
    >
      {/* Poster */}
      <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded sm:h-24 sm:w-16">
        <Image
          src={getPosterUrl(show.poster_path, 'small')}
          alt={show.name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        {/* Title and Status */}
        <div>
          <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-primary sm:text-base">
            {show.name}
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Season {show.current_season}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mt-2">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-text-tertiary">Episodes</span>
            <span className={cn(
              'font-medium',
              episode_status.isComplete ? 'text-success' : 'text-text-secondary'
            )}>
              {episode_status.released} / {episode_status.total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                episode_status.isComplete ? 'bg-success' : 'bg-accent-primary'
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Next Episode / Status */}
        <div className="mt-2 flex items-center gap-1">
          {episode_status.isComplete ? (
            <>
              <Check className="h-3 w-3 text-success" />
              <span className="text-xs font-medium text-success">Season Complete</span>
            </>
          ) : episode_status.nextEpisode && nextEpisodeText ? (
            <>
              <Clock className="h-3 w-3 text-text-tertiary" />
              <span className="text-xs text-text-secondary">
                {nextEpisodeId} &middot; {nextEpisodeText}
              </span>
            </>
          ) : (
            <span className="text-xs text-warning">Airing</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ==========================================================================
// Episode Progress Row Component
// Horizontal scrolling row of episode progress cards
// ==========================================================================

interface EpisodeProgressRowProps {
  title: string;
  shows: TVShowWithEpisodeStatus[];
  href?: string;
  className?: string;
}

export function EpisodeProgressRow({
  title,
  shows,
  href,
  className,
}: EpisodeProgressRowProps) {
  if (shows.length === 0) return null;

  return (
    <section className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          {title}
        </h2>
        {href && (
          <Link
            href={href}
            className="text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
          >
            View all
          </Link>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {shows.map((show) => (
          <div
            key={show.id}
            className="w-64 flex-shrink-0 snap-start sm:w-72 md:w-80"
          >
            <EpisodeProgressCard show={show} />
          </div>
        ))}
      </div>
    </section>
  );
}
