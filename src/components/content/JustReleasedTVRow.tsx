'use client';

import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Tv, Plus, Heart, Calendar, Sparkles, CheckCircle2 } from 'lucide-react';
import { ContentPoster } from './ContentPoster';
import { ContentRating } from './ContentRating';
import { Tooltip } from '@/components/ui';
import { useWatchlistToggle } from '@/components/ui/WatchlistButton';
import { cn, formatAirDateLabel, formatDate, getContentType } from '@/lib/utils';
import type { TVShow } from '@/types';
import { watchlistKey } from '@/stores/watchlist';

const noopSubscribe = () => () => {};

// ==========================================================================
// Just Released TV Row Component
// Shows TV shows with recently aired episodes
// ==========================================================================

// Simplified type without Torrentio availability
export interface JustReleasedTVShowData extends TVShow {
  latestEpisode?: {
    season: number;
    episode: number;
    name: string;
    airDate: string | null;
  };
  seasonProgress?: {
    currentSeason: number;
    releasedEpisodes: number;
    totalEpisodes: number;
    isComplete: boolean;
    isNewShow: boolean;
  };
}

interface JustReleasedTVRowProps {
  shows: JustReleasedTVShowData[];
  watchlistIds?: Set<string>; // watchlistKey() values
  onWatchlistToggle?: (show: JustReleasedTVShowData) => void;
  className?: string;
}

export function JustReleasedTVRow({
  shows,
  watchlistIds,
  onWatchlistToggle,
  className = '',
}: JustReleasedTVRowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const paddingOffset = 40;
    setCanScrollLeft(scrollLeft > paddingOffset);
    setCanScrollRight(scrollLeft < maxScroll - 5);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(() => {
      updateScrollButtons();
    });

    container.addEventListener('scroll', updateScrollButtons);
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      cancelAnimationFrame(rafId);
      container.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons, shows]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (shows.length === 0) return null;

  return (
    <section className={className}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Just Released TV Shows
        </h2>
        <Link
          href="/new/shows"
          className="text-sm font-medium text-text-secondary hover:text-accent-primary transition-colors"
        >
          See All →
        </Link>
      </div>

      {/* Scrollable Container */}
      <div className="group/row relative">
        {/* Scroll Buttons */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={cn(
              'absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
              'rounded-full bg-bg-elevated shadow-lg text-text-primary',
              'opacity-0 transition-opacity hover:bg-bg-tertiary group-hover/row:opacity-100 md:flex'
            )}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={cn(
              'absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center',
              'rounded-full bg-bg-elevated shadow-lg text-text-primary',
              'opacity-0 transition-opacity hover:bg-bg-tertiary group-hover/row:opacity-100 md:flex'
            )}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Content */}
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {shows.map((show, index) => (
            <div
              key={show.id}
              className="w-36 flex-shrink-0 snap-start sm:w-44 md:w-48"
            >
              <JustReleasedTVCard
                show={show}
                priority={index < 4}
                isInWatchlist={watchlistIds?.has(watchlistKey('tv', show.id))}
                onWatchlistToggle={onWatchlistToggle}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Just Released TV Card Component
// ==========================================================================

interface JustReleasedTVCardProps {
  show: JustReleasedTVShowData;
  priority?: boolean;
  isInWatchlist?: boolean;
  onWatchlistToggle?: (show: JustReleasedTVShowData) => void;
  className?: string;
}

function JustReleasedTVCard({
  show,
  priority = false,
  isInWatchlist,
  onWatchlistToggle,
  className = '',
}: JustReleasedTVCardProps) {
  const router = useRouter();
  const detailUrl = `/tv/${show.id}`;
  const similarUrl = `/similar/tv/${show.id}`;
  const watchlist = useWatchlistToggle(
    { id: show.id, title: show.name, media_type: 'tv', content_type: getContentType(show), poster_path: show.poster_path },
    onWatchlistToggle && (() => onWatchlistToggle(show))
  );
  const saved = isInWatchlist ?? watchlist.saved;
  // The page is rendered up to an hour before it is shown, so "2 days ago"
  // can be stale; the server and hydration pass show the date instead
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    watchlist.toggle();
  };

  const handleSimilarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(similarUrl);
  };

  // Format the latest episode info
  const latestEpisode = show.latestEpisode;
  const seasonProgress = show.seasonProgress;
  const episodeLabel = latestEpisode
    ? `S${latestEpisode.season}E${latestEpisode.episode}`
    : null;

  // Calculate progress percentage
  const progressPercent = seasonProgress
    ? Math.round((seasonProgress.releasedEpisodes / seasonProgress.totalEpisodes) * 100)
    : 0;

  return (
    <article
      className={cn(
        'group/card relative overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary',
        'transition-all duration-200 hover:border-badge-tv/50 hover:shadow-lg hover:shadow-badge-tv/10 hover:-translate-y-1',
        className
      )}
    >
      <Link href={detailUrl} className="block">
        {/* Poster Container */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <ContentPoster
            path={show.poster_path}
            alt={show.name}
            size="medium"
            priority={priority}
            fill
            className="transition-transform duration-300 group-hover/card:scale-105"
          />

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100" />

          {/* Quick Actions (visible on hover) */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
            {/* Find Similar Button */}
            <Tooltip content="Find Similar" position="top">
              <button
                onClick={handleSimilarClick}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-badge-tv"
                aria-label="Find similar shows"
              >
                <Plus className="h-5 w-5" />
              </button>
            </Tooltip>

            {/* Watchlist Button */}
            <Tooltip content={saved ? 'In Watchlist' : 'Add to Watchlist'} position="top">
              <button
                onClick={handleWatchlistClick}
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
                  saved
                    ? 'bg-accent-primary text-white'
                    : 'bg-white/20 text-white hover:bg-white/30'
                )}
                aria-label={saved ? 'Remove from watchlist' : 'Add to watchlist'}
              >
                <Heart className={cn('h-5 w-5', saved && 'fill-current')} />
              </button>
            </Tooltip>
          </div>

          {/* Status Badge (top-left) - NEW, COMPLETE, or Episode */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {seasonProgress?.isNewShow ? (
              <span className="flex items-center gap-1 rounded bg-gradient-to-r from-yellow-500 to-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-xs">
                <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                NEW SERIES
              </span>
            ) : seasonProgress?.isComplete ? (
              <span className="flex items-center gap-1 rounded bg-success/90 px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-xs">
                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                COMPLETE
              </span>
            ) : episodeLabel && (
              <span className="flex items-center gap-1 rounded bg-badge-tv/90 px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-xs">
                <Tv className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {episodeLabel}
              </span>
            )}
          </div>

          {/* Rating Badge */}
          {show.vote_average > 0 && (
            <div className="absolute bottom-2 right-2">
              <ContentRating rating={show.vote_average} size="sm" variant="badge" />
            </div>
          )}
        </div>

        {/* Content Info */}
        <div className="p-2">
          <h3 className="truncate text-[13px] font-medium text-text-primary group-hover/card:text-badge-tv">
            {show.name}
          </h3>

          {/* Episode Progress Bar */}
          {seasonProgress && seasonProgress.totalEpisodes > 0 && (
            <div className="mt-1.5">
              <div className="flex items-center justify-between text-[9px] text-text-tertiary mb-0.5">
                <span>Season {seasonProgress.currentSeason}</span>
                <span className={cn(
                  seasonProgress.isComplete ? 'text-success font-medium' : 'text-text-tertiary'
                )}>
                  {seasonProgress.releasedEpisodes}/{seasonProgress.totalEpisodes} eps
                </span>
              </div>
              <div className="h-1 bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    seasonProgress.isComplete ? 'bg-success' : 'bg-badge-tv'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Air date */}
          {latestEpisode?.airDate && (
            <div className="mt-1">
              <p className="flex items-center gap-1 text-[10px] text-text-tertiary">
                <Calendar className="h-2.5 w-2.5" />
                {isClient
                  ? formatAirDateLabel(latestEpisode.airDate)
                  : formatDate(latestEpisode.airDate, { month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}
        </div>
      </Link>
    </article>
  );
}
