import { Star } from 'lucide-react';
import { formatRating } from '@/lib/utils';

// ==========================================================================
// Content Rating Component
// Displays star rating with various styles
// ==========================================================================

interface ContentRatingProps {
  rating: number;
  voteCount?: number;
  showVotes?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'badge' | 'minimal';
  className?: string;
}

export function ContentRating({
  rating,
  voteCount,
  showVotes = false,
  size = 'md',
  variant = 'default',
  className = '',
}: ContentRatingProps) {
  const formattedRating = formatRating(rating);

  // Size configurations
  const sizeConfig = {
    sm: { icon: 'h-3 w-3', text: 'text-xs', gap: 'gap-0.5' },
    md: { icon: 'h-4 w-4', text: 'text-sm', gap: 'gap-1' },
    lg: { icon: 'h-5 w-5', text: 'text-base', gap: 'gap-1.5' },
  };

  const config = sizeConfig[size];

  // Rating color based on score
  const getRatingColor = () => {
    if (rating >= 8) return 'text-success';
    if (rating >= 6) return 'text-warning';
    return 'text-error';
  };

  // Badge variant
  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center rounded-md px-2 py-1 font-medium ${config.text} ${config.gap} ${
          rating >= 8
            ? 'bg-success/20 text-success'
            : rating >= 6
              ? 'bg-warning/20 text-warning'
              : 'bg-error/20 text-error'
        } ${className}`}
      >
        <Star className={`${config.icon} fill-current`} />
        {formattedRating}
      </span>
    );
  }

  // Minimal variant (just number)
  if (variant === 'minimal') {
    return (
      <span className={`font-medium ${config.text} ${getRatingColor()} ${className}`}>
        {formattedRating}
      </span>
    );
  }

  // Default variant
  return (
    <div className={`inline-flex items-center ${config.gap} ${className}`}>
      <Star className={`${config.icon} fill-warning text-warning`} />
      <span className={`font-medium text-text-primary ${config.text}`}>
        {formattedRating}
      </span>
      {showVotes && voteCount !== undefined && (
        <span className={`text-text-tertiary ${config.text}`}>
          ({voteCount.toLocaleString()})
        </span>
      )}
    </div>
  );
}

// ==========================================================================
// Star Rating Display (Visual stars)
// ==========================================================================

interface StarRatingProps {
  rating: number; // 0-10 scale
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StarRating({
  rating,
  maxStars = 5,
  size = 'md',
  className = '',
}: StarRatingProps) {
  // Convert 0-10 rating to 0-maxStars scale
  const normalizedRating = (rating / 10) * maxStars;
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating - fullStars >= 0.5;
  const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const iconClass = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {/* Full stars */}
      {Array.from({ length: fullStars }).map((_, i) => (
        <Star key={`full-${i}`} className={`${iconClass} fill-warning text-warning`} />
      ))}

      {/* Half star (using clip path) */}
      {hasHalfStar && (
        <div className="relative">
          <Star className={`${iconClass} text-border-default`} />
          <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
            <Star className={`${iconClass} fill-warning text-warning`} />
          </div>
        </div>
      )}

      {/* Empty stars */}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <Star key={`empty-${i}`} className={`${iconClass} text-border-default`} />
      ))}
    </div>
  );
}
