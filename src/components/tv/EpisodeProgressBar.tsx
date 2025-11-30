'use client';

import { cn } from '@/lib/utils';
import type { EpisodeStatus } from '@/types';

// ==========================================================================
// Episode Progress Bar Component
// Shows episode release progress for a TV show/season
// ==========================================================================

interface EpisodeProgressBarProps {
  status: EpisodeStatus;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EpisodeProgressBar({
  status,
  showCount = true,
  size = 'md',
  className = '',
}: EpisodeProgressBarProps) {
  const { total, released, isComplete } = status;
  const percentage = total > 0 ? (released / total) * 100 : 0;

  const heightClasses = {
    sm: 'h-1',
    md: 'h-1.5',
    lg: 'h-2',
  };

  const textClasses = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className={cn('w-full', className)}>
      {showCount && (
        <div className={cn('flex justify-between mb-1', textClasses[size])}>
          <span className="text-text-tertiary">Episodes</span>
          <span className="text-text-secondary">
            {released} / {total}
          </span>
        </div>
      )}
      <div
        className={cn(
          'w-full bg-bg-tertiary rounded-full overflow-hidden',
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isComplete ? 'bg-success' : 'bg-accent-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ==========================================================================
// Episode Status Badge Component
// Shows status as a badge (Complete/Airing/Upcoming)
// ==========================================================================

interface EpisodeStatusBadgeProps {
  status: EpisodeStatus;
  showStatus?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function EpisodeStatusBadge({
  status,
  showStatus,
  size = 'md',
  className = '',
}: EpisodeStatusBadgeProps) {
  const { isComplete, isAiring, nextEpisode } = status;

  let label: string;
  let colorClass: string;

  if (isComplete) {
    label = 'Complete';
    colorClass = 'bg-success/20 text-success';
  } else if (nextEpisode) {
    label = 'Airing';
    colorClass = 'bg-warning/20 text-warning';
  } else if (showStatus === 'Returning Series') {
    label = 'Returning';
    colorClass = 'bg-info/20 text-info';
  } else if (isAiring) {
    label = 'Airing';
    colorClass = 'bg-warning/20 text-warning';
  } else {
    label = 'TBA';
    colorClass = 'bg-bg-tertiary text-text-tertiary';
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        colorClass,
        sizeClasses[size],
        className
      )}
    >
      {isComplete && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {label}
    </span>
  );
}

// ==========================================================================
// Next Episode Info Component
// Shows information about the next episode
// ==========================================================================

interface NextEpisodeInfoProps {
  status: EpisodeStatus;
  className?: string;
}

export function NextEpisodeInfo({ status, className = '' }: NextEpisodeInfoProps) {
  const { nextEpisode, isComplete } = status;

  if (isComplete) {
    return (
      <p className={cn('text-xs text-success', className)}>
        Season complete
      </p>
    );
  }

  if (!nextEpisode) {
    return (
      <p className={cn('text-xs text-text-tertiary', className)}>
        No upcoming episodes
      </p>
    );
  }

  const airDate = nextEpisode.air_date ? new Date(nextEpisode.air_date) : null;
  const now = new Date();

  let dateDisplay = 'TBA';
  if (airDate) {
    const diffTime = airDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      dateDisplay = 'Today';
    } else if (diffDays === 1) {
      dateDisplay = 'Tomorrow';
    } else if (diffDays > 0 && diffDays <= 7) {
      dateDisplay = `In ${diffDays} days`;
    } else if (airDate) {
      dateDisplay = airDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  return (
    <div className={cn('text-xs', className)}>
      <p className="text-text-tertiary">Next Episode</p>
      <p className="font-medium text-text-primary">
        S{nextEpisode.season_number}E{nextEpisode.episode_number} &middot; {dateDisplay}
      </p>
    </div>
  );
}
