'use client';

// ==========================================================================
// Season List Component
// Displays list of seasons with posters and episode counts
// ==========================================================================

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Calendar, Film, Eye, EyeOff, Check } from 'lucide-react';
import { getPosterUrl, extractYear, cn } from '@/lib/utils';
import { useSeenHistory, useSeenEpisodeCount, calculateSeasonProgress } from '@/stores/seenHistory';
import { useToast } from '@/components/ui';
import type { Season } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SeasonListProps {
  seasons: Season[];
  showId: number;
  showName: string;
  className?: string;
}

// ==========================================================================
// Season List Component
// ==========================================================================

export function SeasonList({ seasons, showId, showName, className = '' }: SeasonListProps) {
  const [expanded, setExpanded] = useState(false);

  // Show first 3 seasons by default, expand to show all
  const displayedSeasons = expanded ? seasons : seasons.slice(0, 3);
  const hasMore = seasons.length > 3;

  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Seasons ({seasons.length})
        </h2>
      </div>

      <div className="space-y-4">
        {displayedSeasons.map((season) => (
          <SeasonCard
            key={season.id}
            season={season}
            showId={showId}
            showName={showName}
          />
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary sm:py-3 sm:text-base"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show All {seasons.length} Seasons
            </>
          )}
        </button>
      )}
    </section>
  );
}

// ==========================================================================
// Season Card Component
// ==========================================================================

interface SeasonCardProps {
  season: Season;
  showId: number;
  showName: string;
}

function SeasonCard({ season, showId, showName }: SeasonCardProps) {
  const posterUrl = getPosterUrl(season.poster_path, 'small');
  const year = extractYear(season.air_date);
  const hasEpisodes = season.episode_count > 0;

  // Seen tracking - use primitive value selector to avoid infinite loops
  const seenCount = useSeenEpisodeCount(showId, season.season_number);
  const progress = useMemo(
    () => calculateSeasonProgress(seenCount, season.episode_count),
    [seenCount, season.episode_count]
  );
  const markSeasonAsSeen = useSeenHistory((state) => state.markSeasonAsSeen);
  const markSeasonAsUnseen = useSeenHistory((state) => state.markSeasonAsUnseen);
  const { addToast } = useToast();

  const allSeen = hasEpisodes && progress.seen === progress.total;
  const someSeen = progress.seen > 0 && progress.seen < progress.total;

  const handleSeenToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (allSeen) {
      markSeasonAsUnseen(showId, season.season_number);
      addToast({
        type: 'success',
        title: 'Marked as unseen',
        message: `${season.name} episodes removed from seen history`,
        duration: 2000,
      });
    } else {
      markSeasonAsSeen(showId, season.season_number, season.episode_count);
      addToast({
        type: 'success',
        title: 'Marked as seen',
        message: `All ${season.episode_count} episodes of ${season.name} marked as seen`,
        duration: 2000,
      });
    }
  };

  return (
    <Link
      href={`/tv/${showId}/season/${season.season_number}`}
      className="group flex gap-4 rounded-lg border border-border-subtle bg-bg-secondary p-4 transition-colors hover:border-border-default hover:bg-bg-tertiary"
    >
      {/* Poster */}
      <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-md bg-bg-tertiary sm:h-36 sm:w-24">
        {season.poster_path ? (
          <Image
            src={posterUrl}
            alt={`${showName} ${season.name}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(min-width: 640px) 96px, 80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Film className="h-8 w-8 text-text-tertiary" />
          </div>
        )}

        {/* Seen Badge */}
        {allSeen && (
          <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded-full bg-success px-1.5 py-0.5 text-[10px] font-medium text-white shadow-md">
            <Check className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">Seen</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-accent-primary sm:text-base">
            {season.name}
          </h3>

          {/* Mark as Seen Button */}
          {hasEpisodes && (
            <button
              onClick={handleSeenToggle}
              className={cn(
                'flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all hover:scale-105',
                allSeen
                  ? 'bg-success/20 text-success hover:bg-success/30'
                  : someSeen
                    ? 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30'
                    : 'bg-bg-tertiary text-text-tertiary hover:bg-border-default hover:text-text-primary'
              )}
              aria-label={allSeen ? `Mark ${season.name} as unseen` : `Mark all ${season.name} episodes as seen`}
              title={allSeen ? 'Mark as unseen' : 'Mark all as seen'}
            >
              {allSeen ? (
                <>
                  <EyeOff className="h-3 w-3" />
                  <span className="hidden sm:inline">Unseen</span>
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  <span className="hidden sm:inline">Seen All</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary sm:gap-x-3 sm:text-sm">
          {year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {year}
            </span>
          )}
          {hasEpisodes && (
            <span>
              {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {hasEpisodes && progress.seen > 0 && (
          <div className="mt-2">
            <div className="mb-1 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-text-tertiary">
                {progress.seen}/{progress.total} episodes seen
              </span>
              <span className={cn(
                'font-medium',
                allSeen ? 'text-success' : 'text-accent-primary'
              )}>
                {progress.percentage}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  allSeen ? 'bg-success' : 'bg-accent-primary'
                )}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Overview */}
        {season.overview && !progress.seen && (
          <p className="mt-1.5 line-clamp-2 text-xs text-text-secondary sm:mt-2 sm:text-sm">
            {season.overview}
          </p>
        )}
      </div>
    </Link>
  );
}
