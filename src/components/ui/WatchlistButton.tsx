'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { useToast } from './Toast';
import { cn } from '@/lib/utils';

// ==========================================================================
// Watchlist Button Component
// Client component for adding/removing items from watchlist
// Currently shows "Coming Soon" - will be fully implemented later
// ==========================================================================

interface WatchlistButtonProps {
  id: number;
  title: string;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  variant?: 'default' | 'hero';
  className?: string;
}

export function WatchlistButton({
  title,
  variant = 'default',
  className,
}: WatchlistButtonProps) {
  const { addToast } = useToast();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);

    // Show "Coming Soon" toast
    addToast({
      type: 'info',
      title: 'Coming Soon',
      message: `Watchlist feature will be available soon!`,
      duration: 3000,
    });

    // Reset animation after a short delay
    setTimeout(() => setIsAnimating(false), 300);
  };

  if (variant === 'hero') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-text-primary/30 bg-text-primary/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-text-primary/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base',
          isAnimating && 'scale-95',
          className
        )}
      >
        <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
        Add to Watchlist
      </button>
    );
  }

  // Default variant
  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-all hover:bg-border-default hover:text-text-primary',
        isAnimating && 'scale-95',
        className
      )}
    >
      <Heart className="h-4 w-4" />
      Add to Watchlist
    </button>
  );
}
