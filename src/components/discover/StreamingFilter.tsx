'use client';

import Image from 'next/image';
import { Tv, X } from 'lucide-react';
import { STREAMING_PROVIDERS, TMDB_IMAGE_BASE_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ==========================================================================
// Streaming Filter Component
// Filter results by streaming service availability
// ==========================================================================

interface StreamingFilterProps {
  selected: number[];
  onChange: (providers: number[]) => void;
  disabled?: boolean;
  className?: string;
}

// Top streaming providers to show
const TOP_PROVIDERS = STREAMING_PROVIDERS.slice(0, 8);

export function StreamingFilter({
  selected,
  onChange,
  disabled = false,
  className = '',
}: StreamingFilterProps) {
  const handleToggle = (providerId: number) => {
    if (disabled) return;

    if (selected.includes(providerId)) {
      onChange(selected.filter((id) => id !== providerId));
    } else {
      onChange([...selected, providerId]);
    }
  };

  const handleClear = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-text-tertiary">
          <Tv className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Filter by streaming</span>
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className={cn(
              'flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <X className="h-3 w-3" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TOP_PROVIDERS.map((provider) => {
          const isSelected = selected.includes(provider.id);

          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleToggle(provider.id)}
              disabled={disabled}
              className={cn(
                'relative flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200',
                'border',
                isSelected
                  ? 'border-accent-primary/30 bg-accent-primary/10'
                  : 'border-border-default bg-bg-tertiary/50 hover:bg-bg-tertiary hover:border-border-strong',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              title={provider.name}
            >
              <div className="relative h-5 w-5 overflow-hidden rounded">
                <Image
                  src={`${TMDB_IMAGE_BASE_URL}/w45${provider.logo}`}
                  alt={provider.name}
                  fill
                  sizes="20px"
                  className="object-cover"
                />
              </div>
              <span
                className={cn(
                  'text-xs font-medium transition-colors',
                  isSelected ? 'text-accent-primary' : 'text-text-secondary'
                )}
              >
                {provider.name}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="mt-2 text-xs text-text-tertiary">
          Showing content available on {selected.length} service{selected.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default StreamingFilter;
