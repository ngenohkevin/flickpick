'use client';

// ==========================================================================
// SearchOverlay Component
// Full-screen search overlay for mobile devices
// ==========================================================================

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================================================
// SearchOverlay Component
// ==========================================================================

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  // Lock body scroll when overlay is open
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
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] bg-bg-primary transition-opacity duration-200',
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      {/* Header */}
      <div className="flex h-16 items-center gap-4 border-b border-border-subtle px-4">
        <div className="flex-1">
          <SearchBar autoFocus onClose={onClose} />
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          aria-label="Close search"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content area for search results (handled by SearchBar dropdown) */}
      <div className="h-[calc(100vh-4rem)] overflow-y-auto px-4 pt-4">
        {/* Empty state / suggestions could go here */}
        <div className="text-center text-text-tertiary">
          <p className="text-sm">Search for movies, TV shows, and anime</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Anime'].map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-bg-tertiary px-3 py-1.5 text-sm text-text-secondary"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
