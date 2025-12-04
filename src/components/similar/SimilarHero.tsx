'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ContentPoster } from '@/components/content/ContentPoster';
import { ContentRating } from '@/components/content/ContentRating';
import { ContentTypeBadge } from '@/components/ui';
import { getBackdropUrl, extractYear, formatRuntime, cn } from '@/lib/utils';
import type { ContentType, Genre } from '@/types';

// ==========================================================================
// SimilarHero Component
// Hero section for the similar content page showing the source content
// ==========================================================================

interface SimilarHeroProps {
  id: number;
  title: string;
  overview: string;
  tagline?: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  runtime?: number;
  genres: Genre[];
  contentType: ContentType;
  mediaType: 'movie' | 'tv';
  numberOfSeasons?: number;
  className?: string;
}

export function SimilarHero({
  id,
  title,
  overview,
  tagline,
  posterPath,
  backdropPath,
  releaseDate,
  voteAverage,
  voteCount,
  runtime,
  genres,
  contentType,
  mediaType,
  numberOfSeasons,
  className = '',
}: SimilarHeroProps) {
  const year = extractYear(releaseDate);
  const backdropUrl = getBackdropUrl(backdropPath, 'original');
  const detailHref = mediaType === 'movie' ? `/movie/${id}` : `/tv/${id}`;

  // Build metadata string
  const metaItems: string[] = [];
  if (year) metaItems.push(String(year));
  if (mediaType === 'movie' && runtime) {
    metaItems.push(formatRuntime(runtime));
  }
  if (mediaType === 'tv' && numberOfSeasons) {
    metaItems.push(`${numberOfSeasons} Season${numberOfSeasons > 1 ? 's' : ''}`);
  }

  return (
    <section className={cn('relative', className)}>
      {/* Backdrop Image */}
      <div className="absolute inset-0 h-[50vh] min-h-[400px] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative pb-8 pt-24 sm:pb-12 sm:pt-32">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:gap-10">
          {/* Poster (hidden on mobile) */}
          <div className="hidden w-48 flex-shrink-0 lg:block">
            <Link href={detailHref} className="block overflow-hidden rounded-lg shadow-2xl transition-transform hover:scale-105">
              <ContentPoster
                path={posterPath}
                alt={title}
                size="medium"
                priority
              />
            </Link>
          </div>

          {/* Info */}
          <div className="flex-1">
            {/* Label */}
            <p className="mb-2 text-sm font-medium uppercase tracking-wide text-accent-primary">
              Find Similar To
            </p>

            {/* Type Badge */}
            <div className="mb-3">
              <ContentTypeBadge type={contentType} size="sm" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl lg:text-4xl">
              <Link href={detailHref} className="hover:text-accent-primary transition-colors">
                {title}
              </Link>
            </h1>

            {/* Tagline */}
            {tagline && (
              <p className="mt-2 text-base italic text-text-secondary">
                &ldquo;{tagline}&rdquo;
              </p>
            )}

            {/* Meta Info */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              {/* Rating */}
              {voteAverage > 0 && (
                <ContentRating
                  rating={voteAverage}
                  voteCount={voteCount}
                  showVotes
                  size="sm"
                />
              )}

              {/* Separator */}
              {voteAverage > 0 && metaItems.length > 0 && (
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
            {genres.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {genres.slice(0, 4).map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full bg-bg-tertiary/80 px-2.5 py-1 text-xs font-medium text-text-secondary"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>
            )}

            {/* Overview (truncated) */}
            <p className="mt-4 max-w-2xl text-sm text-text-secondary line-clamp-2">
              {overview}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
