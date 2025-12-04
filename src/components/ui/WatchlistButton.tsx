'use client';

import { useState } from 'react';
import { Heart, Check } from 'lucide-react';
import { useWatchlist } from '@/stores/watchlist';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types';

// ==========================================================================
// Watchlist Button Component
// Client component for adding/removing items from watchlist
// ==========================================================================

interface WatchlistButtonProps {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  contentType: ContentType;
  posterPath: string | null;
  variant?: 'default' | 'hero';
  className?: string;
}

export function WatchlistButton({
  id,
  title,
  mediaType,
  contentType,
  posterPath,
  variant = 'default',
  className,
}: WatchlistButtonProps) {
  const watchlist = useWatchlist();
  const isInWatchlist = watchlist.items.some((item) => item.id === id);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);

    watchlist.toggleItem({
      id,
      title,
      media_type: mediaType,
      content_type: contentType,
      poster_path: posterPath,
    });

    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (variant === 'hero') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-6 py-3 font-semibold backdrop-blur-sm transition-all',
          isInWatchlist
            ? 'border-accent-primary/50 bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30'
            : 'border-white/20 bg-white/10 text-text-primary hover:bg-white/20',
          isAnimating && 'scale-95',
          className
        )}
      >
        {isInWatchlist ? (
          <>
            <Check className="h-5 w-5" />
            In Watchlist
          </>
        ) : (
          <>
            <Heart className="h-5 w-5" />
            Add to Watchlist
          </>
        )}
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
        isInWatchlist
          ? 'bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30'
          : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary',
        isAnimating && 'scale-95',
        className
      )}
    >
      <Heart
        className={cn('h-4 w-4', isInWatchlist && 'fill-current')}
      />
      {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
}
