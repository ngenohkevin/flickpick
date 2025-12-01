'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Film, Tv, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui';
import { ContentTypeBadge } from '@/components/ui/Badge';
import { getPosterUrl, formatDate } from '@/lib/utils';
import type { CalendarDay as CalendarDayType, CalendarReleaseItem } from '@/types';

// ==========================================================================
// ReleaseModal Component
// Modal showing all releases for a selected calendar day
// ==========================================================================

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  day: CalendarDayType | null;
}

export function ReleaseModal({ isOpen, onClose, day }: ReleaseModalProps) {
  if (!day) return null;

  const formattedDate = formatDate(day.date.toISOString().split('T')[0], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Separate movies and TV shows
  const movies = day.releases.filter((r) => r.type === 'movie');
  const tvShows = day.releases.filter((r) => r.type === 'tv');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formattedDate}
      description={`${day.releases.length} release${day.releases.length !== 1 ? 's' : ''}`}
      size="lg"
    >
      <div className="max-h-[60vh] overflow-y-auto">
        {/* Movies Section */}
        {movies.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-text-tertiary">
              <Film className="h-4 w-4" />
              Movies ({movies.length})
            </h3>
            <div className="space-y-3">
              {movies.map((release) => (
                <ReleaseItem key={`movie-${release.id}`} release={release} />
              ))}
            </div>
          </div>
        )}

        {/* TV Shows Section */}
        {tvShows.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-text-tertiary">
              <Tv className="h-4 w-4" />
              TV Shows ({tvShows.length})
            </h3>
            <div className="space-y-3">
              {tvShows.map((release) => (
                <ReleaseItem key={`tv-${release.id}`} release={release} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ==========================================================================
// ReleaseItem Component
// Individual release item in the modal
// ==========================================================================

interface ReleaseItemProps {
  release: CalendarReleaseItem;
}

function ReleaseItem({ release }: ReleaseItemProps) {
  const href = release.type === 'movie' ? `/movie/${release.id}` : `/tv/${release.id}`;
  const hasPoster = release.poster_path !== null;
  const posterUrl = hasPoster ? getPosterUrl(release.poster_path, 'small') : null;

  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg border border-border-subtle bg-bg-tertiary/50 p-3 transition-colors hover:border-border-default hover:bg-bg-tertiary"
    >
      {/* Poster */}
      <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded bg-bg-tertiary">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={release.title}
            fill
            sizes="56px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {release.type === 'movie' ? (
              <Film className="h-6 w-6 text-text-tertiary" />
            ) : (
              <Tv className="h-6 w-6 text-text-tertiary" />
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h4 className="font-medium text-text-primary group-hover:text-accent-primary">
            {release.title}
          </h4>
          <ContentTypeBadge type={release.content_type} size="sm" />
        </div>

        {release.episode && (
          <p className="text-sm text-text-secondary">
            Season {release.episode.season}, Episode {release.episode.episode}
            {release.episode.name && (
              <span className="block text-text-tertiary">
                &quot;{release.episode.name}&quot;
              </span>
            )}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1 text-xs text-accent-primary opacity-0 transition-opacity group-hover:opacity-100">
          View details
          <ExternalLink className="h-3 w-3" />
        </div>
      </div>
    </Link>
  );
}
