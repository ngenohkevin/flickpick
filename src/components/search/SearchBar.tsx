'use client';

// ==========================================================================
// SearchBar Component
// Autocomplete search with debouncing, keyboard navigation, recent searches
// ==========================================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, Film, Tv, Sparkles, Loader2 } from 'lucide-react';
import { useDebounce, useLocalStorage } from '@/lib/hooks';
import { cn, getPosterUrl, extractYear } from '@/lib/utils';
import type { SearchResult, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SearchBarProps {
  onClose?: () => void;
  autoFocus?: boolean;
  className?: string;
  placeholder?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

// ==========================================================================
// Constants
// ==========================================================================

const MAX_RECENT_SEARCHES = 5;
const DEBOUNCE_DELAY = 300;

// ==========================================================================
// Content Type Config
// ==========================================================================

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
// SearchBar Component
// ==========================================================================

export function SearchBar({
  onClose,
  autoFocus = false,
  className = '',
  placeholder = 'Search movies, TV shows, anime...',
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useLocalStorage<RecentSearch[]>(
    'flickpick-recent-searches',
    []
  );

  // Debounce search query
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Auto-focus input
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

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
          `/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=8`
        );
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

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
  }, [results, query]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const addRecentSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (!trimmedQuery) return;

      setRecentSearches((prev) => {
        // Remove duplicate if exists
        const filtered = prev.filter(
          (s) => s.query.toLowerCase() !== trimmedQuery.toLowerCase()
        );
        // Add new search at the beginning
        const updated = [{ query: trimmedQuery, timestamp: Date.now() }, ...filtered];
        // Keep only recent searches
        return updated.slice(0, MAX_RECENT_SEARCHES);
      });
    },
    [setRecentSearches]
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addRecentSearch(query);
      setIsOpen(false);
      setQuery('');

      // Navigate to content detail page
      const path = result.media_type === 'movie' ? `/movie/${result.id}` : `/tv/${result.id}`;
      router.push(path);
      onClose?.();
    },
    [router, query, addRecentSearch, onClose]
  );

  const handleRecentSelect = useCallback(
    (recentQuery: string) => {
      setQuery(recentQuery);
      inputRef.current?.focus();
    },
    []
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  const removeRecentSearch = useCallback(
    (queryToRemove: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setRecentSearches((prev) =>
        prev.filter((s) => s.query.toLowerCase() !== queryToRemove.toLowerCase())
      );
    },
    [setRecentSearches]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems =
        results.length > 0 ? results.length : recentSearches.length;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0) {
            if (results.length > 0 && results[selectedIndex]) {
              handleSelect(results[selectedIndex]);
            } else if (recentSearches[selectedIndex]) {
              handleRecentSelect(recentSearches[selectedIndex].query);
            }
          } else if (query.trim()) {
            addRecentSearch(query);
            router.push(`/search?q=${encodeURIComponent(query)}`);
            setIsOpen(false);
            onClose?.();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          onClose?.();
          break;
      }
    },
    [
      results,
      recentSearches,
      selectedIndex,
      query,
      handleSelect,
      handleRecentSelect,
      addRecentSearch,
      router,
      onClose,
    ]
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
  // Render Helpers
  // ==========================================================================

  const showDropdown =
    isOpen && (query.length > 0 || recentSearches.length > 0);
  const showResults = query.length >= 2 && (results.length > 0 || isLoading);
  const showRecentSearches =
    !showResults && recentSearches.length > 0 && query.length === 0;

  // ==========================================================================
  // Render
  // ==========================================================================

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
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-full border border-border-default bg-bg-tertiary py-3 pl-12 pr-12 text-text-primary placeholder:text-text-tertiary transition-all duration-200 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-primary"
          aria-label="Search"
          aria-controls="search-results-listbox"
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
          id="search-results-listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[400px] overflow-y-auto rounded-xl border border-border-subtle bg-bg-secondary shadow-lg"
          role="listbox"
        >
          {/* Search Results */}
          {showResults && (
            <div className="py-2">
              {isLoading && results.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
                </div>
              ) : results.length > 0 ? (
                results.map((result, index) => (
                  <SearchResultItem
                    key={`${result.media_type}-${result.id}`}
                    result={result}
                    isSelected={index === selectedIndex}
                    onSelect={() => handleSelect(result)}
                  />
                ))
              ) : query.length >= 2 && !isLoading ? (
                <div className="py-8 text-center text-text-tertiary">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              ) : null}
            </div>
          )}

          {/* Recent Searches */}
          {showRecentSearches && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium text-text-tertiary">
                  Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-text-tertiary transition-colors hover:text-text-primary"
                >
                  Clear all
                </button>
              </div>
              {recentSearches.map((recent, index) => (
                <div
                  key={recent.query}
                  onClick={() => handleRecentSelect(recent.query)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRecentSelect(recent.query)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-tertiary',
                    index === selectedIndex && 'bg-bg-tertiary'
                  )}
                  role="option"
                  aria-selected={index === selectedIndex}
                  tabIndex={0}
                >
                  <Clock className="h-4 w-4 text-text-tertiary" />
                  <span className="flex-1 text-text-primary">{recent.query}</span>
                  <button
                    onClick={(e) => removeRecentSearch(recent.query, e)}
                    className="rounded-full p-1 text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                    aria-label={`Remove ${recent.query} from recent searches`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Search Result Item Component
// ==========================================================================

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onSelect: () => void;
}

function SearchResultItem({ result, isSelected, onSelect }: SearchResultItemProps) {
  const config = CONTENT_TYPE_CONFIG[result.content_type];
  const Icon = config.icon;
  const year = extractYear(result.release_date || result.first_air_date);

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-bg-tertiary',
        isSelected && 'bg-bg-tertiary'
      )}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
    >
      {/* Poster */}
      <div className="relative h-14 w-10 flex-shrink-0 overflow-hidden rounded bg-bg-tertiary">
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
