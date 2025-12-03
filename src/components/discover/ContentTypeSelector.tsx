'use client';

import { Film, Tv, Sparkles, Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types';

// ==========================================================================
// Content Type Selector Component
// Compact toggle chips for filtering by content type
// ==========================================================================

interface ContentTypeSelectorProps {
  selected: ContentType[];
  onChange: (types: ContentType[]) => void;
  disabled?: boolean;
  className?: string;
}

interface TypeOption {
  type: ContentType;
  label: string;
  icon: React.ReactNode;
  activeClass: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  {
    type: 'movie',
    label: 'Movies',
    icon: <Film className="h-3.5 w-3.5" />,
    activeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/20',
  },
  {
    type: 'tv',
    label: 'TV',
    icon: <Tv className="h-3.5 w-3.5" />,
    activeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20',
  },
  {
    type: 'animation',
    label: 'Animation',
    icon: <Clapperboard className="h-3.5 w-3.5" />,
    activeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
  },
  {
    type: 'anime',
    label: 'Anime',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    activeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30 hover:bg-pink-500/20',
  },
];

export function ContentTypeSelector({
  selected,
  onChange,
  disabled = false,
  className = '',
}: ContentTypeSelectorProps) {
  const handleToggle = (type: ContentType) => {
    if (disabled) return;

    if (selected.includes(type)) {
      onChange(selected.filter((t) => t !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  const isAllSelected = selected.length === 0;

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {/* All chip */}
      <button
        type="button"
        onClick={handleSelectAll}
        disabled={disabled}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
          isAllSelected
            ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
            : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        All
      </button>

      <div className="h-4 w-px bg-border-subtle" />

      {/* Type chips */}
      {TYPE_OPTIONS.map((option) => {
        const isSelected = selected.includes(option.type);

        return (
          <button
            key={option.type}
            type="button"
            onClick={() => handleToggle(option.type)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
              isSelected
                ? option.activeClass
                : 'border-border-default bg-transparent text-text-tertiary hover:text-text-secondary hover:border-border-strong',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            aria-pressed={isSelected}
          >
            {option.icon}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ContentTypeSelector;
