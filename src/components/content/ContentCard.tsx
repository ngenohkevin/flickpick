'use client';

import Link from 'next/link';
import { Play, Plus, Check } from 'lucide-react';
import { ContentPoster } from './ContentPoster';
import { ContentRating } from './ContentRating';
import { ContentTypeBadge } from '@/components/ui';
import {
  getContentTitle,
  getContentReleaseDate,
  getContentType,
  extractYear,
  isWithinHours,
  cn,
} from '@/lib/utils';
import type { Content } from '@/types';

// ==========================================================================
// Content Card Component
// Universal card for movies, TV shows, animation, and anime
// ==========================================================================

interface ContentCardProps {
  content: Content;
  priority?: boolean;
  showTypeBadge?: boolean;
  showRating?: boolean;
  showYear?: boolean;
  showNewBadge?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (content: Content) => void;
  className?: string;
}

export function ContentCard({
  content,
  priority = false,
  showTypeBadge = true,
  showRating = true,
  showYear = true,
  showNewBadge = true,
  isInWatchlist = false,
  onWatchlistToggle,
  className = '',
}: ContentCardProps) {
  const title = getContentTitle(content);
  const releaseDate = getContentReleaseDate(content);
  const year = extractYear(releaseDate);
  const contentType = getContentType(content);
  const isNew = showNewBadge && isWithinHours(releaseDate, 48);

  // Build the detail page URL
  const detailUrl =
    content.media_type === 'tv' || 'first_air_date' in content
      ? `/tv/${content.id}`
      : `/movie/${content.id}`;

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWatchlistToggle?.(content);
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary',
        'transition-all duration-200 hover:border-border-default hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      <Link href={detailUrl} className="block">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <ContentPoster
            path={content.poster_path}
            alt={title}
            size="medium"
            priority={priority}
            fill
            className="transition-transform duration-300 group-hover:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

          {/* Quick Actions (visible on hover) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
              {isInWatchlist ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </button>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">
              <Play className="h-5 w-5" />
            </span>
          </div>

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {isNew && (
              <span className="rounded bg-accent-primary px-2 py-0.5 text-xs font-bold text-white">
                NEW
              </span>
            )}
            {showTypeBadge && <ContentTypeBadge type={contentType} size="sm" />}
          </div>

          {/* Rating Badge */}
          {showRating && content.vote_average > 0 && (
            <div className="absolute bottom-2 right-2">
              <ContentRating rating={content.vote_average} size="sm" variant="badge" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="p-3">
          <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-primary">
            {title}
          </h3>
          {showYear && year && (
            <p className="mt-0.5 text-xs text-text-tertiary">{year}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

// ==========================================================================
// Compact Content Card (for search results, lists)
// ==========================================================================

interface CompactContentCardProps {
  content: Content;
  showTypeBadge?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CompactContentCard({
  content,
  showTypeBadge = true,
  onClick,
  className = '',
}: CompactContentCardProps) {
  const title = getContentTitle(content);
  const releaseDate = getContentReleaseDate(content);
  const year = extractYear(releaseDate);
  const contentType = getContentType(content);

  const detailUrl =
    content.media_type === 'tv' || 'first_air_date' in content
      ? `/tv/${content.id}`
      : `/movie/${content.id}`;

  const sharedClassName = cn(
    'flex items-center gap-3 rounded-lg p-2 text-left transition-colors',
    'hover:bg-bg-tertiary',
    className
  );

  const innerContent = (
    <>
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded">
        <ContentPoster path={content.poster_path} alt={title} size="small" fill />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-text-primary">{title}</h4>
        <div className="mt-0.5 flex items-center gap-2">
          {year && <span className="text-xs text-text-tertiary">{year}</span>}
          {content.vote_average > 0 && (
            <ContentRating rating={content.vote_average} size="sm" variant="minimal" />
          )}
        </div>
        {showTypeBadge && (
          <div className="mt-1">
            <ContentTypeBadge type={contentType} size="sm" showIcon={false} />
          </div>
        )}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClassName}>
        {innerContent}
      </button>
    );
  }

  return (
    <Link href={detailUrl} className={sharedClassName}>
      {innerContent}
    </Link>
  );
}
