'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
// Bottom sheet for filters on mobile devices with drag-to-dismiss
// ==========================================================================

export function MobileFilterSheet({
  filters,
  onFilterChange,
  onClearFilters,
  contentType,
  activeFilterCount,
}: MobileFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

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

  // Drag handlers
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    startYRef.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = clientY - startYRef.current;
    // Only allow dragging down (positive values)
    if (deltaY > 0) {
      setDragY(deltaY);
    }
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    // If dragged more than 100px, close the sheet
    if (dragY > 100) {
      setIsOpen(false);
    }
    setDragY(0);
  }, [dragY]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientY);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  // Mouse event handlers (for desktop testing)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleDragStart(e.clientY);
  }, [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY);
    };

    const handleMouseUp = () => {
      handleDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

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
        ref={sheetRef}
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 flex max-h-[80vh] transform flex-col overflow-hidden rounded-t-2xl bg-bg-primary lg:hidden',
          isOpen ? 'translate-y-0' : 'translate-y-full',
          !isDragging && 'transition-transform duration-300'
        )}
        style={{
          transform: isOpen ? `translateY(${dragY}px)` : 'translateY(100%)',
        }}
      >
        {/* Drag Handle - Interactive */}
        <div
          className="flex cursor-grab justify-center py-3 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
        >
          <div className="h-1.5 w-12 rounded-full bg-border-strong" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 pb-4">
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
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          <FilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
            contentType={contentType}
          />
        </div>

        {/* Footer Actions - Always visible */}
        <div className="shrink-0 border-t border-border-subtle bg-bg-primary p-4 pb-6">
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
