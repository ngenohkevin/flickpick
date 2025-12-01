'use client';

import { Film, Tv, Sparkles } from 'lucide-react';

// ==========================================================================
// CalendarFilters Component
// Filter tabs for calendar content type
// ==========================================================================

export type CalendarTypeFilter = 'all' | 'movie' | 'tv';

interface CalendarFiltersProps {
  activeFilter: CalendarTypeFilter;
  onFilterChange: (filter: CalendarTypeFilter) => void;
}

const FILTERS: { value: CalendarTypeFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All', icon: Sparkles },
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'tv', label: 'TV Shows', icon: Tv },
];

export function CalendarFilters({ activeFilter, onFilterChange }: CalendarFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.value;

        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={`
              flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors
              ${isActive
                ? 'bg-accent-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
              }
            `}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" />
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
