import { Film, Tv, Clapperboard, Sparkles, Star } from 'lucide-react';
import type { ContentType } from '@/types';

// ==========================================================================
// Badge Component
// Versatile badge for labels, tags, and status indicators
// ==========================================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'movie' | 'tv' | 'animation' | 'anime' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
  };

  const variantStyles = {
    default: 'bg-bg-tertiary text-text-secondary',
    movie: 'bg-badge-movie/20 text-badge-movie',
    tv: 'bg-badge-tv/20 text-badge-tv',
    animation: 'bg-badge-animation/20 text-badge-animation',
    anime: 'bg-badge-anime/20 text-badge-anime',
    success: 'bg-success/20 text-success',
    warning: 'bg-warning/20 text-warning',
    error: 'bg-error/20 text-error',
  };

  return (
    <span
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

// ==========================================================================
// Content Type Badge
// Specialized badge for movie/tv/animation/anime
// ==========================================================================

interface ContentTypeBadgeProps {
  type: ContentType;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ContentTypeBadge({
  type,
  showIcon = true,
  size = 'sm',
  className = '',
}: ContentTypeBadgeProps) {
  const config = {
    movie: { label: 'Movie', icon: Film, variant: 'movie' as const },
    tv: { label: 'TV Show', icon: Tv, variant: 'tv' as const },
    animation: { label: 'Animation', icon: Clapperboard, variant: 'animation' as const },
    anime: { label: 'Anime', icon: Sparkles, variant: 'anime' as const },
  };

  const { label, icon: Icon, variant } = config[type];
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <Badge variant={variant} size={size} className={className}>
      {showIcon && <Icon className={iconSize} />}
      {label}
    </Badge>
  );
}

// ==========================================================================
// Rating Badge
// Badge displaying star rating
// ==========================================================================

interface RatingBadgeProps {
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function RatingBadge({ rating, size = 'sm', className = '' }: RatingBadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-md';

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-2.5 py-1.5 text-sm gap-1.5',
  };

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  // Color based on rating
  const ratingColor =
    rating >= 8
      ? 'bg-success/20 text-success'
      : rating >= 6
        ? 'bg-warning/20 text-warning'
        : 'bg-error/20 text-error';

  return (
    <span className={`${baseStyles} ${sizeStyles[size]} ${ratingColor} ${className}`}>
      <Star className={`${iconSize} fill-current`} />
      {rating.toFixed(1)}
    </span>
  );
}

// ==========================================================================
// Genre Badge
// Badge for genre pills
// ==========================================================================

interface GenreBadgeProps {
  children: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
  className?: string;
}

export function GenreBadge({
  children,
  onClick,
  isActive = false,
  className = '',
}: GenreBadgeProps) {
  const baseStyles =
    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors';

  const stateStyles = isActive
    ? 'bg-accent-primary text-white'
    : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary';

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      onClick={onClick}
      className={`${baseStyles} ${stateStyles} ${className}`}
    >
      {children}
    </Component>
  );
}

// ==========================================================================
// Status Badge
// Badge for airing status (TV shows)
// ==========================================================================

interface StatusBadgeProps {
  status: 'airing' | 'complete' | 'returning' | 'ended' | 'upcoming';
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className = '' }: StatusBadgeProps) {
  const config = {
    airing: { label: 'Airing', variant: 'warning' as const },
    complete: { label: 'Complete', variant: 'success' as const },
    returning: { label: 'Returning', variant: 'success' as const },
    ended: { label: 'Ended', variant: 'default' as const },
    upcoming: { label: 'Upcoming', variant: 'movie' as const },
  };

  const { label, variant } = config[status];

  return (
    <Badge variant={variant} size={size} className={className}>
      {status === 'complete' && '✓ '}
      {label}
    </Badge>
  );
}
