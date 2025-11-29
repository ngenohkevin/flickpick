'use client';

// ==========================================================================
// Season List Component
// Displays list of seasons with posters and episode counts
// ==========================================================================

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Calendar, Film } from 'lucide-react';
import { getPosterUrl, extractYear } from '@/lib/utils';
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
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-4 py-3 font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
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
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <h3 className="font-semibold text-text-primary group-hover:text-accent-primary">
          {season.name}
        </h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-tertiary">
          {year && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {year}
            </span>
          )}
          {hasEpisodes && (
            <span>
              {season.episode_count} Episode{season.episode_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Overview */}
        {season.overview && (
          <p className="mt-2 line-clamp-2 text-sm text-text-secondary">
            {season.overview}
          </p>
        )}
      </div>
    </Link>
  );
}
