'use client';

// ==========================================================================
// SelectedTitles Component
// Display selected titles for blending with remove option
// ==========================================================================

import { X, Film, Tv, Sparkles, GripVertical } from 'lucide-react';
import { cn, getPosterUrl } from '@/lib/utils';
import type { ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

export interface SelectedTitle {
  id: number;
  title: string;
  type: 'movie' | 'tv';
  poster_path: string | null;
  year: number;
  content_type: ContentType;
}

interface SelectedTitlesProps {
  titles: SelectedTitle[];
  onRemove: (id: number) => void;
  maxTitles?: number;
  className?: string;
}

// ==========================================================================
// Content Type Config
// ==========================================================================

const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { icon: typeof Film; color: string; borderColor: string }
> = {
  movie: {
    icon: Film,
    color: 'text-badge-movie',
    borderColor: 'border-badge-movie/30 hover:border-badge-movie/50',
  },
  tv: {
    icon: Tv,
    color: 'text-badge-tv',
    borderColor: 'border-badge-tv/30 hover:border-badge-tv/50',
  },
  animation: {
    icon: Sparkles,
    color: 'text-badge-animation',
    borderColor: 'border-badge-animation/30 hover:border-badge-animation/50',
  },
  anime: {
    icon: Sparkles,
    color: 'text-badge-anime',
    borderColor: 'border-badge-anime/30 hover:border-badge-anime/50',
  },
};

// ==========================================================================
// SelectedTitles Component
// ==========================================================================

export function SelectedTitles({
  titles,
  onRemove,
  maxTitles = 3,
  className = '',
}: SelectedTitlesProps) {
  if (titles.length === 0) {
    return (
      <div className={cn('flex flex-wrap gap-3 justify-center', className)}>
        {Array.from({ length: maxTitles }).map((_, i) => (
          <EmptySlot key={i} index={i + 1} />
        ))}
      </div>
    );
  }

  // Fill remaining slots with empty placeholders
  const emptySlots = Array.from({ length: Math.max(0, maxTitles - titles.length) });

  return (
    <div className={cn('flex flex-wrap gap-3 justify-center', className)}>
      {titles.map((title) => (
        <SelectedTitleCard key={title.id} title={title} onRemove={onRemove} />
      ))}
      {emptySlots.map((_, i) => (
        <EmptySlot key={`empty-${i}`} index={titles.length + i + 1} />
      ))}
    </div>
  );
}

// ==========================================================================
// SelectedTitleCard Component
// ==========================================================================

interface SelectedTitleCardProps {
  title: SelectedTitle;
  onRemove: (id: number) => void;
}

function SelectedTitleCard({ title, onRemove }: SelectedTitleCardProps) {
  const config = CONTENT_TYPE_CONFIG[title.content_type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-xl border-2 bg-bg-secondary/80 p-2 pr-3',
        'transition-all duration-200 hover:bg-bg-secondary',
        config.borderColor
      )}
    >
      {/* Drag handle (visual only for now) */}
      <GripVertical className="hidden sm:block h-4 w-4 text-text-tertiary/50" />

      {/* Poster */}
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-bg-tertiary">
        {title.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPosterUrl(title.poster_path, 'small')}
            alt={title.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 max-w-[140px]">
        <p className="truncate text-sm font-medium text-text-primary">{title.title}</p>
        <p className="text-xs text-text-tertiary">{title.year}</p>
      </div>

      {/* Remove button */}
      <button
        onClick={() => onRemove(title.id)}
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full',
          'bg-bg-tertiary text-text-tertiary transition-all duration-200',
          'hover:bg-red-500/20 hover:text-red-400',
          'focus:outline-none focus:ring-2 focus:ring-red-500/30'
        )}
        aria-label={`Remove ${title.title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ==========================================================================
// Empty Slot Component
// ==========================================================================

interface EmptySlotProps {
  index: number;
}

function EmptySlot({ index }: EmptySlotProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border-2 border-dashed border-border-default/50 p-2 pr-3',
        'opacity-50'
      )}
    >
      {/* Placeholder for grip */}
      <div className="hidden sm:block h-4 w-4" />

      {/* Empty poster placeholder */}
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-bg-tertiary/50">
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-lg font-bold text-text-tertiary/50">{index}</span>
        </div>
      </div>

      {/* Empty info placeholder */}
      <div className="min-w-0 flex-1 max-w-[140px]">
        <div className="h-4 w-20 rounded bg-bg-tertiary/30" />
        <div className="mt-1 h-3 w-12 rounded bg-bg-tertiary/30" />
      </div>

      {/* Empty button placeholder */}
      <div className="h-6 w-6" />
    </div>
  );
}

export default SelectedTitles;
