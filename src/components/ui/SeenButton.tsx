'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useSeenHistory, useIsSeen } from '@/stores/seenHistory';
import { useToast } from './Toast';
import { cn } from '@/lib/utils';
import type { MediaType, ContentType } from '@/types';

// ==========================================================================
// Seen Button Component
// Allows users to mark content as seen/unseen
// ==========================================================================

interface SeenButtonProps {
  id: number;
  title: string;
  mediaType: MediaType;
  contentType: ContentType;
  posterPath: string | null;
  variant?: 'hero' | 'default' | 'icon' | 'card';
  showLabel?: boolean;
  className?: string;
}

export function SeenButton({
  id,
  title,
  mediaType,
  contentType,
  posterPath,
  variant = 'default',
  showLabel = true,
  className = '',
}: SeenButtonProps) {
  const isSeen = useIsSeen(id, mediaType);
  const toggleSeen = useSeenHistory((state) => state.toggleSeen);
  const { addToast } = useToast();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleSeen({
      id,
      media_type: mediaType,
      content_type: contentType,
      title,
      poster_path: posterPath,
    });

    addToast({
      type: 'success',
      title: isSeen ? 'Marked as unseen' : 'Marked as seen',
      message: isSeen
        ? `${title} removed from your seen history`
        : `${title} added to your seen history`,
      duration: 2000,
    });
  };

  // Variant styles
  const variantStyles = {
    hero: cn(
      'inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-all sm:gap-2 sm:px-6 sm:py-3 sm:text-base',
      isSeen
        ? 'border-success/30 bg-success/20 text-success hover:bg-success/30'
        : 'border-text-primary/30 bg-text-primary/10 text-text-primary hover:bg-text-primary/20'
    ),
    default: cn(
      'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
      isSeen
        ? 'bg-success/20 text-success hover:bg-success/30'
        : 'bg-bg-tertiary text-text-primary hover:bg-border-default'
    ),
    icon: cn(
      'rounded-full p-2 transition-all hover:scale-110 btn-press',
      isSeen
        ? 'bg-success/20 text-success hover:bg-success/30'
        : 'text-text-tertiary hover:bg-bg-tertiary hover:text-text-primary'
    ),
    card: cn(
      'flex h-10 w-10 items-center justify-center rounded-full transition-all hover:scale-110 btn-press',
      isSeen
        ? 'bg-success text-white'
        : 'bg-white/20 text-white hover:bg-white/30'
    ),
  };

  const Icon = isSeen ? Eye : EyeOff;
  const label = isSeen ? 'Seen' : 'Mark as Seen';
  const ariaLabel = isSeen ? `Mark ${title} as unseen` : `Mark ${title} as seen`;

  return (
    <button
      onClick={handleClick}
      className={cn(variantStyles[variant], className)}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon className={cn(
        variant === 'hero' ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-4 w-4',
        isSeen && 'fill-current'
      )} />
      {showLabel && variant !== 'icon' && variant !== 'card' && (
        <span>{label}</span>
      )}
    </button>
  );
}

// ==========================================================================
// Seen Indicator Component
// Shows a small badge when content has been seen
// ==========================================================================

interface SeenIndicatorProps {
  id: number;
  mediaType: MediaType;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

export function SeenIndicator({
  id,
  mediaType,
  position = 'top-right',
  className = '',
}: SeenIndicatorProps) {
  const isSeen = useIsSeen(id, mediaType);

  if (!isSeen) return null;

  const positionStyles = {
    'top-left': 'top-2 left-2',
    'top-right': 'top-2 right-2',
    'bottom-left': 'bottom-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  };

  return (
    <div
      className={cn(
        'absolute z-10 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-xs font-medium text-white shadow-md',
        positionStyles[position],
        className
      )}
    >
      <Eye className="h-3 w-3" />
      <span>Seen</span>
    </div>
  );
}

// ==========================================================================
// Compact Seen Toggle (for lists and cards)
// ==========================================================================

interface CompactSeenToggleProps {
  id: number;
  title: string;
  mediaType: MediaType;
  contentType: ContentType;
  posterPath: string | null;
  className?: string;
}

export function CompactSeenToggle({
  id,
  title,
  mediaType,
  contentType,
  posterPath,
  className = '',
}: CompactSeenToggleProps) {
  const isSeen = useIsSeen(id, mediaType);
  const toggleSeen = useSeenHistory((state) => state.toggleSeen);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    toggleSeen({
      id,
      media_type: mediaType,
      content_type: contentType,
      title,
      poster_path: posterPath,
    });
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'rounded-full p-1.5 backdrop-blur-sm transition-all',
        isSeen
          ? 'bg-success/90 text-white'
          : 'bg-bg-primary/80 text-text-tertiary hover:bg-success/20 hover:text-success',
        className
      )}
      aria-label={isSeen ? `Mark ${title} as unseen` : `Mark ${title} as seen`}
      title={isSeen ? 'Seen - Click to unmark' : 'Mark as seen'}
    >
      <Eye className={cn('h-4 w-4', isSeen && 'fill-current')} />
    </button>
  );
}
