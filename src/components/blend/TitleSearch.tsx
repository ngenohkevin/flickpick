'use client';

// ==========================================================================
// TitleSearch Component
// Search and select titles for the blend feature
// ==========================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Film, Tv, Sparkles } from 'lucide-react';
import { useDebounce } from '@/lib/hooks';
import { cn, getPosterUrl, extractYear } from '@/lib/utils';
import type { SearchResult, ContentType } from '@/types';

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

interface TitleSearchProps {
  onSelect: (title: SelectedTitle) => void;
  excludeIds?: number[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

// ==========================================================================
// Constants
// ==========================================================================

const DEBOUNCE_DELAY = 300;

const CONTENT_TYPE_CONFIG: Record<
  ContentType,
  { icon: typeof Film; color: string; label: string }
> = {
  movie: { icon: Film, color: 'text-badge-movie bg-badge-movie/20', label: 'Movie' },
  tv: { icon: Tv, color: 'text-badge-tv bg-badge-tv/20', label: 'TV' },
  animation: { icon: Sparkles, color: 'text-badge-animation bg-badge-animation/20', label: 'Animation' },
  anime: { icon: Sparkles, color: 'text-badge-anime bg-badge-anime/20', label: 'Anime' },
};

// ==========================================================================
// TitleSearch Component
// ==========================================================================

export function TitleSearch({
  onSelect,
  excludeIds = [],
  placeholder = 'Search for a movie or TV show...',
  className = '',
  disabled = false,
}: TitleSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Debounce search query
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);

  // Excluded IDs set for faster lookup
  const excludeSet = new Set(excludeIds);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          // Filter out excluded IDs
          const filtered = (data.results || []).filter(
            (r: SearchResult) => !excludeSet.has(r.id)
          );
          setResults(filtered);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleSelect = useCallback(
    (result: SearchResult) => {
      const selectedTitle: SelectedTitle = {
        id: result.id,
        title: result.title,
        type: result.media_type,
        poster_path: result.poster_path,
        year: extractYear(result.release_date || result.first_air_date) ?? 0,
        content_type: result.content_type,
      };

      onSelect(selectedTitle);
      setQuery('');
      setResults([]);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < results.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : results.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [results, selectedIndex, handleSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // ==========================================================================
  // Render
  // ==========================================================================

  const showDropdown = isOpen && query.length >= 2;

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full rounded-xl border border-border-default bg-bg-tertiary py-3 pl-12 pr-12',
            'text-text-primary placeholder:text-text-tertiary',
            'transition-all duration-200',
            'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-primary',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          aria-label="Search for titles"
          aria-controls="title-search-results"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />
        {/* Loading / Clear Button */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
          ) : query.length > 0 ? (
            <button
              onClick={handleClear}
              type="button"
              className="rounded-full p-0.5 text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          id="title-search-results"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[350px] overflow-y-auto rounded-xl border border-border-subtle bg-bg-secondary shadow-lg"
          role="listbox"
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <TitleSearchResult
                  key={`${result.media_type}-${result.id}`}
                  result={result}
                  isSelected={index === selectedIndex}
                  onSelect={() => handleSelect(result)}
                />
              ))}
            </div>
          ) : query.length >= 2 && !isLoading ? (
            <div className="py-8 text-center text-text-tertiary">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Search Result Item
// ==========================================================================

interface TitleSearchResultProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
}

function TitleSearchResult({ result, isSelected, onSelect }: TitleSearchResultProps) {
  const config = CONTENT_TYPE_CONFIG[result.content_type];
  const Icon = config.icon;
  const year = extractYear(result.release_date || result.first_air_date);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-bg-tertiary',
        isSelected && 'bg-bg-tertiary'
      )}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Poster */}
      <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-bg-tertiary">
        {result.poster_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getPosterUrl(result.poster_path, 'small')}
            alt={result.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="h-5 w-5 text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-primary">{result.title}</p>
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          {year && <span>{year}</span>}
          {result.vote_average > 0 && (
            <>
              <span>&middot;</span>
              <span>{result.vote_average.toFixed(1)}</span>
            </>
          )}
        </div>
      </div>

      {/* Content Type Badge */}
      <span
        className={cn(
          'flex-shrink-0 rounded px-2 py-0.5 text-xs font-medium',
          config.color
        )}
      >
        {config.label}
      </span>
    </div>
  );
}

export default TitleSearch;
