'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { MOVIE_GENRES, TV_GENRES, LANGUAGES, STREAMING_PROVIDERS, TMDB_IMAGE_BASE_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

export interface FilterState {
  genres: number[];
  yearFrom: number | null;
  yearTo: number | null;
  ratingMin: number | null;
  language: string | null;
  provider: string | null;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  contentType: 'movie' | 'tv' | 'animation' | 'anime';
  className?: string;
}

// ==========================================================================
// Filter Sidebar Component
// ==========================================================================

export function FilterSidebar({
  filters,
  onFilterChange,
  onClearFilters,
  contentType,
  className = '',
}: FilterSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['genres', 'year', 'rating'])
  );

  // Get appropriate genre list based on content type
  const genres = contentType === 'tv' ? TV_GENRES : MOVIE_GENRES;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleGenreToggle = (genreId: number) => {
    const newGenres = filters.genres.includes(genreId)
      ? filters.genres.filter((id) => id !== genreId)
      : [...filters.genres, genreId];
    onFilterChange({ ...filters, genres: newGenres });
  };

  const handleYearChange = (type: 'from' | 'to', value: string) => {
    const numValue = value ? parseInt(value, 10) : null;
    if (type === 'from') {
      onFilterChange({ ...filters, yearFrom: numValue });
    } else {
      onFilterChange({ ...filters, yearTo: numValue });
    }
  };

  const handleRatingChange = (value: string) => {
    const numValue = value ? parseFloat(value) : null;
    onFilterChange({ ...filters, ratingMin: numValue });
  };

  const handleLanguageChange = (value: string) => {
    onFilterChange({ ...filters, language: value || null });
  };

  const handleProviderChange = (providerId: string) => {
    const newProvider = filters.provider === providerId ? null : providerId;
    onFilterChange({ ...filters, provider: newProvider });
  };

  const hasActiveFilters =
    filters.genres.length > 0 ||
    filters.yearFrom !== null ||
    filters.yearTo !== null ||
    filters.ratingMin !== null ||
    filters.language !== null ||
    filters.provider !== null;

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <aside className={cn('space-y-6', className)}>
      {/* Header with Clear button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent-primary"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      {/* Genre Filter */}
      <FilterSection
        title="Genres"
        isExpanded={expandedSections.has('genres')}
        onToggle={() => toggleSection('genres')}
        count={filters.genres.length}
      >
        <div className="flex flex-wrap gap-2">
          {Object.entries(genres).map(([id, name]) => {
            const genreId = parseInt(id, 10);
            const isSelected = filters.genres.includes(genreId);
            return (
              <button
                key={id}
                onClick={() => handleGenreToggle(genreId)}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  isSelected
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Year Range Filter */}
      <FilterSection
        title="Year"
        isExpanded={expandedSections.has('year')}
        onToggle={() => toggleSection('year')}
        count={filters.yearFrom || filters.yearTo ? 1 : 0}
      >
        <div className="flex items-center gap-2">
          <select
            value={filters.yearFrom ?? ''}
            onChange={(e) => handleYearChange('from', e.target.value)}
            className="flex-1 rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">From</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <span className="text-text-tertiary">-</span>
          <select
            value={filters.yearTo ?? ''}
            onChange={(e) => handleYearChange('to', e.target.value)}
            className="flex-1 rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">To</option>
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </FilterSection>

      {/* Rating Filter */}
      <FilterSection
        title="Minimum Rating"
        isExpanded={expandedSections.has('rating')}
        onToggle={() => toggleSection('rating')}
        count={filters.ratingMin ? 1 : 0}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">
              {filters.ratingMin ? `${filters.ratingMin}+` : 'Any rating'}
            </span>
            {filters.ratingMin && (
              <button
                onClick={() => handleRatingChange('')}
                className="text-text-tertiary hover:text-text-primary"
              >
                Clear
              </button>
            )}
          </div>
          <input
            type="range"
            min="0"
            max="9"
            step="0.5"
            value={filters.ratingMin ?? 0}
            onChange={(e) => handleRatingChange(e.target.value === '0' ? '' : e.target.value)}
            className="w-full accent-accent-primary"
          />
          <div className="flex justify-between text-xs text-text-tertiary">
            <span>Any</span>
            <span>5</span>
            <span>9+</span>
          </div>
        </div>
      </FilterSection>

      {/* Language Filter */}
      <FilterSection
        title="Language"
        isExpanded={expandedSections.has('language')}
        onToggle={() => toggleSection('language')}
        count={filters.language ? 1 : 0}
      >
        <select
          value={filters.language ?? ''}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full rounded-md border border-border-default bg-bg-tertiary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">All Languages</option>
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Streaming Provider Filter */}
      <FilterSection
        title="Streaming Service"
        isExpanded={expandedSections.has('provider')}
        onToggle={() => toggleSection('provider')}
        count={filters.provider ? 1 : 0}
      >
        <div className="grid grid-cols-2 gap-2">
          {STREAMING_PROVIDERS.map((provider) => {
            const isSelected = filters.provider === String(provider.id);
            return (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(String(provider.id))}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors',
                  isSelected
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-default bg-bg-tertiary hover:border-border-strong'
                )}
              >
                <Image
                  src={`${TMDB_IMAGE_BASE_URL}/w45${provider.logo}`}
                  alt={provider.name}
                  width={24}
                  height={24}
                  className="rounded"
                />
                <span className={cn(
                  'text-xs font-medium truncate',
                  isSelected ? 'text-accent-primary' : 'text-text-secondary'
                )}>
                  {provider.name}
                </span>
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="rounded-lg bg-bg-tertiary p-3">
          <p className="text-xs font-medium text-text-tertiary uppercase mb-2">Active Filters</p>
          <div className="flex flex-wrap gap-1.5">
            {filters.genres.map((genreId) => (
              <span
                key={genreId}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary"
              >
                {genres[genreId]}
                <button
                  onClick={() => handleGenreToggle(genreId)}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {(filters.yearFrom || filters.yearTo) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary">
                {filters.yearFrom ?? 'Any'} - {filters.yearTo ?? 'Now'}
                <button
                  onClick={() => onFilterChange({ ...filters, yearFrom: null, yearTo: null })}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.ratingMin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary">
                {filters.ratingMin}+ rating
                <button
                  onClick={() => handleRatingChange('')}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.language && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary">
                {LANGUAGES[filters.language]}
                <button
                  onClick={() => handleLanguageChange('')}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.provider && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs text-accent-primary">
                {STREAMING_PROVIDERS.find(p => String(p.id) === filters.provider)?.name}
                <button
                  onClick={() => handleProviderChange(filters.provider!)}
                  className="hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

// ==========================================================================
// Filter Section Component
// ==========================================================================

interface FilterSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}

function FilterSection({
  title,
  isExpanded,
  onToggle,
  count = 0,
  children,
}: FilterSectionProps) {
  return (
    <div className="border-b border-border-subtle pb-4">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-2"
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{title}</span>
          {count > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-primary text-xs font-medium text-white">
              {count}
            </span>
          )}
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-text-tertiary" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-tertiary" />
        )}
      </button>
      {isExpanded && <div className="pt-3">{children}</div>}
    </div>
  );
}

// ==========================================================================
// Default Filter State
// ==========================================================================

export const defaultFilters: FilterState = {
  genres: [],
  yearFrom: null,
  yearTo: null,
  ratingMin: null,
  language: null,
  provider: null,
};
