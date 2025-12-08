'use client';

// ==========================================================================
// Watchlist Page
// /watchlist - Shows user's saved movies and TV shows
// ==========================================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Trash2, Shuffle, X, Film, Tv, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useWatchlist } from '@/stores/watchlist';
import { useSeenHistory, useIsSeen } from '@/stores/seenHistory';
import { WatchlistEmpty } from '@/components/watchlist';
import { useToast } from '@/components/ui';
import { getPosterUrl, cn } from '@/lib/utils';
import type { ContentType, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type SortOption = 'added_desc' | 'added_asc' | 'title_asc' | 'title_desc';
type FilterOption = ContentType | 'all';
type SeenFilterOption = 'all' | 'seen' | 'not_seen';

// ==========================================================================
// Content Type Badge Config
// ==========================================================================

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; className: string }> = {
  movie: { label: 'Movie', className: 'bg-badge-movie/20 text-badge-movie' },
  tv: { label: 'TV', className: 'bg-badge-tv/20 text-badge-tv' },
  animation: { label: 'Animation', className: 'bg-badge-animation/20 text-badge-animation' },
  anime: { label: 'Anime', className: 'bg-badge-anime/20 text-badge-anime' },
};

// ==========================================================================
// Page Component
// ==========================================================================

export default function WatchlistPage() {
  const items = useWatchlist((state) => state.items);
  const removeItem = useWatchlist((state) => state.removeItem);
  const clearWatchlist = useWatchlist((state) => state.clearWatchlist);
  const getRandomItem = useWatchlist((state) => state.getRandomItem);
  const seenItems = useSeenHistory((state) => state.items);
  const isSeen = useSeenHistory((state) => state.isSeen);

  const [filter, setFilter] = useState<FilterOption>('all');
  const [seenFilter, setSeenFilter] = useState<SeenFilterOption>('all');
  const [sort, setSort] = useState<SortOption>('added_desc');
  const [pickedItem, setPickedItem] = useState<WatchlistItem | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = filter === 'all'
      ? items
      : items.filter((item) => item.content_type === filter);

    // Apply seen filter
    if (seenFilter === 'seen') {
      result = result.filter((item) => isSeen(item.id, item.media_type));
    } else if (seenFilter === 'not_seen') {
      result = result.filter((item) => !isSeen(item.id, item.media_type));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'added_desc':
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
        case 'added_asc':
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case 'title_asc':
          return a.title.localeCompare(b.title);
        case 'title_desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

    return result;
  }, [items, filter, seenFilter, sort, isSeen]);

  // Count by type
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: items.length };
    items.forEach((item) => {
      result[item.content_type] = (result[item.content_type] || 0) + 1;
    });
    return result;
  }, [items]);

  // Count by seen status
  const seenCounts = useMemo(() => {
    let seen = 0;
    let notSeen = 0;
    items.forEach((item) => {
      if (isSeen(item.id, item.media_type)) {
        seen++;
      } else {
        notSeen++;
      }
    });
    return { all: items.length, seen, not_seen: notSeen };
  }, [items, isSeen]);

  // Handle "Pick for me"
  const handlePickForMe = () => {
    const random = getRandomItem(filter);
    setPickedItem(random);
  };

  // Handle clear all
  const handleClearAll = () => {
    clearWatchlist();
    setShowClearConfirm(false);
    setPickedItem(null);
  };

  // Empty state
  if (items.length === 0) {
    return (
      <main className="container py-8 md:py-12">
        <h1 className="mb-6 text-2xl font-bold text-text-primary sm:mb-8 sm:text-3xl md:text-4xl">
          My Watchlist
        </h1>
        <WatchlistEmpty />
      </main>
    );
  }

  return (
    <main className="container py-8 md:py-12">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl md:text-4xl">
            My Watchlist
          </h1>
          <p className="mt-1 text-sm text-text-secondary sm:text-base">
            {items.length} {items.length === 1 ? 'title' : 'titles'} saved
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePickForMe}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover sm:gap-2 sm:px-4 sm:text-base"
          >
            <Shuffle className="h-4 w-4" />
            Pick for me
          </button>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-error sm:gap-2 sm:px-4 sm:text-base"
          >
            <Trash2 className="h-4 w-4" />
            Clear all
          </button>
        </div>
      </div>

      {/* Picked Item Modal */}
      {pickedItem && (
        <div className="mb-6 rounded-lg border border-accent-primary bg-accent-primary/5 p-3 sm:mb-8 sm:p-4 md:p-6">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-md sm:h-36 sm:w-24">
              <Image
                src={getPosterUrl(pickedItem.poster_path, 'small')}
                alt={pickedItem.title}
                fill
                className="object-cover"
                sizes="(min-width: 640px) 96px, 64px"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-accent-primary sm:text-sm">Your pick for tonight:</p>
                  <h2 className="text-lg font-semibold text-text-primary sm:text-xl md:text-2xl">
                    {pickedItem.title}
                  </h2>
                  <span
                    className={cn(
                      'mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                      CONTENT_TYPE_CONFIG[pickedItem.content_type].className
                    )}
                  >
                    {CONTENT_TYPE_CONFIG[pickedItem.content_type].label}
                  </span>
                </div>
                <button
                  onClick={() => setPickedItem(null)}
                  className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                  aria-label="Dismiss"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 sm:mt-4">
                <Link
                  href={`/${pickedItem.media_type}/${pickedItem.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-hover sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                >
                  View Details
                </Link>
                <button
                  onClick={handlePickForMe}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-tertiary sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
                >
                  <Shuffle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Pick another
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Sort */}
      <div className="mb-6 flex flex-col gap-4">
        {/* Type Filters */}
        <div className="flex flex-wrap gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            count={counts.all}
          >
            All
          </FilterButton>
          <FilterButton
            active={filter === 'movie'}
            onClick={() => setFilter('movie')}
            count={counts.movie}
            icon={<Film className="h-4 w-4" />}
          >
            Movies
          </FilterButton>
          <FilterButton
            active={filter === 'tv'}
            onClick={() => setFilter('tv')}
            count={counts.tv}
            icon={<Tv className="h-4 w-4" />}
          >
            TV Shows
          </FilterButton>
          <FilterButton
            active={filter === 'animation'}
            onClick={() => setFilter('animation')}
            count={counts.animation}
          >
            Animation
          </FilterButton>
          <FilterButton
            active={filter === 'anime'}
            onClick={() => setFilter('anime')}
            count={counts.anime}
            icon={<Sparkles className="h-4 w-4" />}
          >
            Anime
          </FilterButton>
        </div>

        {/* Seen Status Filters and Sort */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Seen Filters */}
          <div className="flex flex-wrap gap-2">
            <SeenFilterButton
              active={seenFilter === 'all'}
              onClick={() => setSeenFilter('all')}
              count={seenCounts.all}
            >
              All Status
            </SeenFilterButton>
            <SeenFilterButton
              active={seenFilter === 'not_seen'}
              onClick={() => setSeenFilter('not_seen')}
              count={seenCounts.not_seen}
              icon={<EyeOff className="h-4 w-4" />}
            >
              Not Seen
            </SeenFilterButton>
            <SeenFilterButton
              active={seenFilter === 'seen'}
              onClick={() => setSeenFilter('seen')}
              count={seenCounts.seen}
              icon={<Eye className="h-4 w-4" />}
            >
              Seen
            </SeenFilterButton>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-tertiary">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded-md border border-border-default bg-bg-secondary px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            >
              <option value="added_desc">Recently added</option>
              <option value="added_asc">Oldest first</option>
              <option value="title_asc">Title (A-Z)</option>
              <option value="title_desc">Title (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty Filter State */}
      {filteredItems.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-text-secondary">
            No {filter === 'all' ? 'items' : CONTENT_TYPE_CONFIG[filter].label.toLowerCase()} in your watchlist.
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-4 text-accent-primary hover:underline"
          >
            Show all items
          </button>
        </div>
      )}

      {/* Watchlist Grid */}
      {filteredItems.length > 0 && (
        <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredItems.map((item) => (
            <WatchlistCard
              key={`${item.media_type}-${item.id}`}
              item={item}
              onRemove={() => removeItem(item.id, item.media_type)}
            />
          ))}
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-bg-elevated p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-text-primary">
              Clear watchlist?
            </h3>
            <p className="mt-2 text-text-secondary">
              This will remove all {items.length} items from your watchlist.
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="rounded-md px-4 py-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="rounded-md bg-error px-4 py-2 font-medium text-white transition-colors hover:bg-error/90"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ==========================================================================
// Filter Button Component
// ==========================================================================

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function FilterButton({ active, onClick, count, icon, children }: FilterButtonProps) {
  if (count === undefined || count === 0) {
    // Don't render if count is 0 (except for "All")
    if (children !== 'All') return null;
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-accent-primary text-white'
          : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      )}
    >
      {icon}
      {children}
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            'ml-1 rounded-full px-1.5 py-0.5 text-xs',
            active ? 'bg-white/20' : 'bg-bg-tertiary'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ==========================================================================
// Seen Filter Button Component
// ==========================================================================

interface SeenFilterButtonProps {
  active: boolean;
  onClick: () => void;
  count?: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

function SeenFilterButton({ active, onClick, count, icon, children }: SeenFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-success/20 text-success ring-1 ring-success/30'
          : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
      )}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'ml-1 rounded-full px-1.5 py-0.5 text-xs',
            active ? 'bg-success/20' : 'bg-bg-tertiary'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ==========================================================================
// Watchlist Card Component
// ==========================================================================

interface WatchlistCardProps {
  item: WatchlistItem;
  onRemove: () => void;
}

function WatchlistCard({ item, onRemove }: WatchlistCardProps) {
  const posterUrl = getPosterUrl(item.poster_path, 'medium');
  const isSeen = useIsSeen(item.id, item.media_type);
  const toggleSeen = useSeenHistory((state) => state.toggleSeen);
  const { addToast } = useToast();

  const handleSeenClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSeen({
      id: item.id,
      media_type: item.media_type,
      content_type: item.content_type,
      title: item.title,
      poster_path: item.poster_path,
    });
    addToast({
      type: 'success',
      title: isSeen ? 'Marked as unseen' : 'Marked as seen',
      duration: 2000,
    });
  };

  return (
    <div className="group relative">
      <Link
        href={`/${item.media_type}/${item.id}`}
        className="block overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary transition-all hover:border-border-default hover:shadow-lg"
      >
        {/* Poster */}
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={posterUrl}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 20vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
          />

          {/* Type Badge */}
          <span
            className={cn(
              'absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium',
              CONTENT_TYPE_CONFIG[item.content_type].className
            )}
          >
            {CONTENT_TYPE_CONFIG[item.content_type].label}
          </span>

          {/* Seen Badge */}
          {isSeen && (
            <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-white shadow-md">
              <Eye className="h-3 w-3" />
              <span>Seen</span>
            </div>
          )}

          {/* Action Buttons (visible on hover) */}
          <div className="absolute right-2 top-2 flex flex-col gap-1.5 opacity-0 transition-all group-hover:opacity-100">
            {/* Remove Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              className="rounded-full bg-bg-primary/80 p-1.5 text-text-tertiary backdrop-blur-sm transition-all hover:bg-error hover:text-white"
              aria-label={`Remove ${item.title} from watchlist`}
            >
              <X className="h-4 w-4" />
            </button>

            {/* Seen Toggle Button */}
            <button
              onClick={handleSeenClick}
              className={cn(
                'rounded-full p-1.5 backdrop-blur-sm transition-all',
                isSeen
                  ? 'bg-success text-white hover:bg-success/80'
                  : 'bg-bg-primary/80 text-text-tertiary hover:bg-success hover:text-white'
              )}
              aria-label={isSeen ? `Mark ${item.title} as unseen` : `Mark ${item.title} as seen`}
              title={isSeen ? 'Mark as unseen' : 'Mark as seen'}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>

          {/* Heart indicator */}
          <div className="absolute bottom-2 right-2 rounded-full bg-bg-primary/80 p-1.5 backdrop-blur-sm">
            <Heart className="h-4 w-4 fill-error text-error" />
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="truncate text-sm font-medium text-text-primary group-hover:text-accent-primary">
            {item.title}
          </h3>
          <p className="mt-1 text-xs text-text-tertiary">
            Added {formatDate(item.added_at)}
          </p>
        </div>
      </Link>
    </div>
  );
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString();
}
