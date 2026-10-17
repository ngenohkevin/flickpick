'use client';

import { useState, useSyncExternalStore } from 'react';
import { Heart } from 'lucide-react';
import { useToast } from './Toast';
import { cn } from '@/lib/utils';
import { useWatchlist } from '@/stores/watchlist';
import type { ContentType, WatchlistItem } from '@/types';

// ==========================================================================
// Watchlist Button Component
// Hero/default button for detail pages. It used to be a "Coming Soon" stub,
// so the watchlist's main entry point did nothing.
// ==========================================================================

interface WatchlistButtonProps {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  contentType?: ContentType;
  variant?: 'default' | 'hero';
  className?: string;
}

const noopSubscribe = () => () => {};

/**
 * Saved state and toggle for one title, shared by every watchlist heart.
 * `onToggle` lets a page that tracks the watchlist itself do the toggling;
 * otherwise the store is updated here. (The cards' hearts used to show a
 * "coming soon" toast and ignore the handler their page passed.)
 */
export function useWatchlistToggle(item: Omit<WatchlistItem, 'added_at'>, onToggle?: () => void) {
  const { addToast } = useToast();
  const toggleItem = useWatchlist((state) => state.toggleItem);
  const inStore = useWatchlist((state) => state.isInWatchlist(item.id, item.media_type));
  // The watchlist lives in localStorage; render the unsaved state on the
  // server and the first client pass so hydration matches, then the real one.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const saved = isClient && inStore;

  const toggle = () => {
    if (onToggle) onToggle();
    else toggleItem(item);
    addToast({
      type: 'success',
      title: saved ? 'Removed from watchlist' : 'Added to watchlist',
      message: item.title,
      duration: 2500,
    });
  };

  return { saved, toggle };
}

export function WatchlistButton({
  id,
  title,
  mediaType,
  posterPath,
  contentType,
  variant = 'default',
  className,
}: WatchlistButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { saved, toggle } = useWatchlistToggle({
    id,
    title,
    media_type: mediaType,
    content_type: contentType ?? mediaType,
    poster_path: posterPath,
  });

  const handleClick = () => {
    setIsAnimating(true);
    toggle();
    setTimeout(() => setIsAnimating(false), 300);
  };

  const label = saved ? 'In Watchlist' : 'Add to Watchlist';
  const icon = <Heart className={cn(variant === 'hero' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-4 w-4', saved && 'fill-current')} />;

  if (variant === 'hero') {
    return (
      <button
        onClick={handleClick}
        aria-pressed={saved}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-text-primary/30 bg-text-primary/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-text-primary/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base',
          isAnimating && 'scale-95',
          className
        )}
      >
        {icon}
        {label}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      aria-pressed={saved}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-border-default hover:text-text-primary',
        isAnimating && 'scale-95',
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
