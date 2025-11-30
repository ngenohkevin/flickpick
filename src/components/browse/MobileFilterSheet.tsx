'use client';

import { useEffect, useState } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';
import { FilterSidebar, type FilterState } from './FilterSidebar';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface MobileFilterSheetProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  contentType: 'movie' | 'tv' | 'animation' | 'anime';
  activeFilterCount: number;
}

// ==========================================================================
// Mobile Filter Sheet Component
// Bottom sheet for filters on mobile devices
// ==========================================================================

export function MobileFilterSheet({
  filters,
  onFilterChange,
  onClearFilters,
  contentType,
  activeFilterCount,
}: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Filter Button - Fixed at bottom on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary shadow-lg transition-all hover:bg-bg-tertiary lg:hidden"
      >
        <SlidersHorizontal className="h-5 w-5" />
        Filters
        {activeFilterCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[85vh] transform overflow-hidden rounded-t-2xl bg-bg-primary transition-transform duration-300 lg:hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full'
        )}
      >
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="h-1 w-12 rounded-full bg-border-default" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 pb-4">
          <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded-full p-2 hover:bg-bg-tertiary"
            aria-label="Close filters"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(85vh - 120px)' }}>
          <FilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            contentType={contentType}
          />
        </div>

        {/* Footer Actions */}
        <div className="border-t border-border-subtle p-4">
          <div className="flex gap-3">
            <button
              onClick={onClearFilters}
              className="flex-1 rounded-md border border-border-default bg-bg-tertiary px-4 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-md bg-accent-primary px-4 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
