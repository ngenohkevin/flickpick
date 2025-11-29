'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Check, Heart } from 'lucide-react';
import { ContentPoster } from './ContentPoster';
import { ContentRating } from './ContentRating';
import { ContentTypeBadge, Button } from '@/components/ui';
import {
  getBackdropUrl,
  getContentTitle,
  getContentReleaseDate,
  getContentType,
  extractYear,
  formatRuntime,
  cn,
  isMovie,
} from '@/lib/utils';
import type { Content, Genre } from '@/types';

// ==========================================================================
// Content Hero Component
// Full-width hero section for detail pages
// ==========================================================================

interface ContentHeroProps {
  content: Content & {
    tagline?: string;
    runtime?: number;
    genres?: Genre[];
    number_of_seasons?: number;
    number_of_episodes?: number;
  };
  onPlayTrailer?: () => void;
  isInWatchlist?: boolean;
  onWatchlistToggle?: () => void;
  className?: string;
}

export function ContentHero({
  content,
  onPlayTrailer,
  isInWatchlist = false,
  onWatchlistToggle,
  className = '',
}: ContentHeroProps) {
  const title = getContentTitle(content);
  const releaseDate = getContentReleaseDate(content);
  const year = extractYear(releaseDate);
  const contentType = getContentType(content);
  const backdropUrl = getBackdropUrl(content.backdrop_path, 'original');

  // Build metadata string
  const metaItems: string[] = [];
  if (year) metaItems.push(String(year));
  if (isMovie(content) && content.runtime) {
    metaItems.push(formatRuntime(content.runtime));
  }
  if (!isMovie(content) && content.number_of_seasons) {
    const seasons = content.number_of_seasons;
    metaItems.push(`${seasons} Season${seasons > 1 ? 's' : ''}`);
  }

  return (
    <section className={cn('relative', className)}>
      {/* Backdrop Image */}
      <div className="absolute inset-0 h-[70vh] min-h-[500px] overflow-hidden">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-bg-secondary" />
        )}

        {/* Gradient Overlays */}
        <div className="gradient-overlay-left absolute inset-0" />
        <div className="gradient-overlay-bottom absolute inset-0" />
      </div>

      {/* Content */}
      <div className="container relative pb-12 pt-32 sm:pb-16 sm:pt-40 lg:pt-48">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:gap-12">
          {/* Poster (hidden on mobile, shown on larger screens) */}
          <div className="hidden w-64 flex-shrink-0 lg:block xl:w-80">
            <div className="overflow-hidden rounded-lg shadow-2xl">
              <ContentPoster
                path={content.poster_path}
                alt={title}
                size="large"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1">
            {/* Type Badge */}
            <div className="mb-4">
              <ContentTypeBadge type={contentType} size="md" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
              {title}
            </h1>

            {/* Tagline */}
            {content.tagline && (
              <p className="mt-2 text-lg italic text-text-secondary">
                &ldquo;{content.tagline}&rdquo;
              </p>
            )}

            {/* Meta Info */}
            <div className="mt-4 flex flex-wrap items-center gap-3 text-text-secondary">
              {/* Rating */}
              {content.vote_average > 0 && (
                <ContentRating
                  rating={content.vote_average}
                  voteCount={content.vote_count}
                  showVotes
                  size="md"
                />
              )}

              {/* Separator */}
              {content.vote_average > 0 && metaItems.length > 0 && (
                <span className="text-border-default">•</span>
              )}

              {/* Year, Runtime, etc */}
              {metaItems.map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {item}
                  {i < metaItems.length - 1 && (
                    <span className="text-border-default">•</span>
                  )}
                </span>
              ))}
            </div>

            {/* Genres */}
            {content.genres && content.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {content.genres.map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/${content.media_type}/${genre.name.toLowerCase().replace(/\s+/g, '-')}`}
                    className="rounded-full bg-bg-tertiary px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Overview */}
            <p className="mt-6 max-w-2xl text-text-secondary line-clamp-4">
              {content.overview}
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              {onPlayTrailer && (
                <Button
                  size="lg"
                  leftIcon={<Play className="h-5 w-5" />}
                  onClick={onPlayTrailer}
                >
                  Play Trailer
                </Button>
              )}

              <Button
                variant={isInWatchlist ? 'secondary' : 'secondary'}
                size="lg"
                leftIcon={
                  isInWatchlist ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Heart className="h-5 w-5" />
                  )
                }
                onClick={onWatchlistToggle}
              >
                {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Mini Hero (for similar/category pages)
// ==========================================================================

interface MiniHeroProps {
  title: string;
  subtitle?: string;
  backdropPath?: string | null;
  className?: string;
}

export function MiniHero({
  title,
  subtitle,
  backdropPath,
  className = '',
}: MiniHeroProps) {
  const backdropUrl = getBackdropUrl(backdropPath ?? null, 'large');

  return (
    <section className={cn('relative overflow-hidden', className)}>
      {/* Background */}
      <div className="absolute inset-0">
        {backdropUrl ? (
          <Image
            src={backdropUrl}
            alt=""
            fill
            className="object-cover opacity-30"
            sizes="100vw"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-r from-accent-primary/20 to-badge-anime/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-bg-primary/60" />
      </div>

      {/* Content */}
      <div className="container relative py-12 sm:py-16 lg:py-20">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-lg text-text-secondary">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
