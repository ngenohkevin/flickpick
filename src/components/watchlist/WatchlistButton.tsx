'use client';

// ==========================================================================
// Watchlist Button Component
// Heart icon button to add/remove items from watchlist
// ==========================================================================

import { Heart } from 'lucide-react';
import { useWatchlist, useIsInWatchlist } from '@/stores/watchlist';
import { cn } from '@/lib/utils';
import type { MediaType, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface WatchlistButtonProps {
  id: number;
  title: string;
  mediaType: MediaType;
  contentType: ContentType;
  posterPath: string | null;
  variant?: 'default' | 'icon' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// ==========================================================================
// Watchlist Button Component
// ==========================================================================

export function WatchlistButton({
  id,
  title,
  mediaType,
  contentType,
  posterPath,
  variant = 'default',
  size = 'md',
  className,
}: WatchlistButtonProps) {
  const toggleItem = useWatchlist((state) => state.toggleItem);
  const isInWatchlist = useIsInWatchlist(id, mediaType);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleItem({
      id,
      title,
      media_type: mediaType,
      content_type: contentType,
      poster_path: posterPath,
    });
  };

  // Size classes
  const sizeClasses = {
    sm: {
      button: 'p-1.5',
      icon: 'h-4 w-4',
      text: 'text-sm px-3 py-1.5',
    },
    md: {
      button: 'p-2',
      icon: 'h-5 w-5',
      text: 'text-base px-4 py-2',
    },
    lg: {
      button: 'p-3',
      icon: 'h-6 w-6',
      text: 'text-base px-6 py-3',
    },
  };

  // Icon-only button (for cards, overlays)
  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'rounded-full transition-all duration-200',
          'bg-bg-primary/80 backdrop-blur-sm hover:bg-bg-primary',
          sizeClasses[size].button,
          className
        )}
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Heart
          className={cn(
            sizeClasses[size].icon,
            'transition-colors duration-200',
            isInWatchlist
              ? 'fill-error text-error'
              : 'text-text-secondary hover:text-error'
          )}
        />
      </button>
    );
  }

  // Filled button (standalone, prominent)
  if (variant === 'filled') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
          isInWatchlist
            ? 'bg-error/10 text-error hover:bg-error/20'
            : 'bg-bg-tertiary text-text-primary hover:bg-border-default',
          sizeClasses[size].text,
          className
        )}
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <Heart
          className={cn(
            sizeClasses[size].icon,
            isInWatchlist && 'fill-current'
          )}
        />
        {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
      </button>
    );
  }

  // Default button (outlined)
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'border border-border-default bg-bg-secondary hover:bg-bg-tertiary',
        isInWatchlist && 'border-error/50 bg-error/5',
        sizeClasses[size].text,
        className
      )}
      aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <Heart
        className={cn(
          sizeClasses[size].icon,
          isInWatchlist
            ? 'fill-error text-error'
            : 'text-text-secondary'
        )}
      />
      {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
}
