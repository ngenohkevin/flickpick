'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tv, LayoutGrid, List, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TVShowCard, CompactTVShowCard } from '@/components/tv';
import { SkeletonGrid } from '@/components/ui';
import { FilterSidebar, defaultFilters, type FilterState } from '@/components/browse/FilterSidebar';
import { MobileFilterSheet } from '@/components/browse/MobileFilterSheet';
import { useWatchlist } from '@/stores/watchlist';
import { cn } from '@/lib/utils';
import type { TVShow, EpisodeStatus, PaginatedResponse, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type ShowStatus = 'all' | 'airing' | 'complete' | 'returning' | 'upcoming';
type ViewMode = 'card' | 'list';
type SortOption = 'next_episode' | 'updated' | 'rating' | 'popularity';

interface TVShowWithEpisodeStatus extends TVShow {
  episode_status: EpisodeStatus;
  current_season: number;
}

interface NewShowsResponse extends PaginatedResponse<TVShowWithEpisodeStatus> {
  status_filter: ShowStatus;
}

// ==========================================================================
// Status Tabs
// ==========================================================================

const STATUS_TABS: { value: ShowStatus; label: string; description: string }[] = [
  { value: 'all', label: 'All Shows', description: 'All currently airing shows' },
  { value: 'airing', label: 'Airing Now', description: 'Shows with upcoming episodes' },
  { value: 'complete', label: 'Season Complete', description: 'Finished seasons' },
  { value: 'upcoming', label: 'This Week', description: 'New episodes this week' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'next_episode', label: 'Next Episode' },
  { value: 'updated', label: 'Recently Updated' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popularity', label: 'Most Popular' },
];

// ==========================================================================
// New Shows Page Content
// ==========================================================================

export function NewShowsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial values from URL
  const initialStatus = (searchParams.get('status') as ShowStatus) ?? 'all';
  const initialSort = (searchParams.get('sort') as SortOption) ?? 'next_episode';
  const initialView = (searchParams.get('view') as ViewMode) ?? 'card';

  // State
  const [activeStatus, setActiveStatus] = useState<ShowStatus>(initialStatus);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [filters, setFilters] = useState<FilterState>(() => ({
    genres: searchParams.get('genre') ? searchParams.get('genre')!.split(',').map(Number) : [],
    yearFrom: null,
    yearTo: null,
    ratingMin: searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : null,
    language: null,
    provider: null,
    runtime: null,
  }));

  // Data state
  const [shows, setShows] = useState<TVShowWithEpisodeStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => item.id));

  // Scroll direction for auto-hide sticky bar
  const [isBarVisible, setIsBarVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 100; // Start checking after scrolling 100px

      if (currentScrollY < scrollThreshold) {
        setIsBarVisible(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down
        setIsBarVisible(false);
      } else {
        // Scrolling up
        setIsBarVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ==========================================================================
  // Data Fetching
  // ==========================================================================

  const buildApiUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('status', activeStatus);
    params.set('sort', sortBy);

    if (filters.genres.length > 0) {
      params.set('genre', filters.genres.join(','));
    }
    if (activeStatus === 'upcoming') {
      params.set('hasNewEpisodes', 'true');
    }

    return `/api/new/shows?${params.toString()}`;
  }, [activeStatus, sortBy, filters]);

  const fetchShows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl());
      if (!response.ok) throw new Error('Failed to fetch shows');
      const data: NewShowsResponse = await response.json();
      setShows(data.results);
    } catch (err) {
      console.error('Error fetching shows:', err);
      setError('Failed to load shows. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [buildApiUrl]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchShows();
  }, [fetchShows]);

  // ==========================================================================
  // URL Management
  // ==========================================================================

  const updateUrl = useCallback(
    (newStatus: ShowStatus, newSort: SortOption, newView: ViewMode, newFilters: FilterState) => {
      const params = new URLSearchParams();

      if (newStatus !== 'all') {
        params.set('status', newStatus);
      }
      if (newSort !== 'next_episode') {
        params.set('sort', newSort);
      }
      if (newView !== 'card') {
        params.set('view', newView);
      }
      if (newFilters.genres.length > 0) {
        params.set('genre', newFilters.genres.join(','));
      }
      if (newFilters.ratingMin) {
        params.set('rating', String(newFilters.ratingMin));
      }

      const queryString = params.toString();
      const newUrl = queryString ? `/new/shows?${queryString}` : '/new/shows';
      router.push(newUrl, { scroll: false });
    },
    [router]
  );

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleStatusChange = (status: ShowStatus) => {
    setActiveStatus(status);
    updateUrl(status, sortBy, viewMode, filters);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    updateUrl(activeStatus, sort, viewMode, filters);
  };

  const handleViewChange = (view: ViewMode) => {
    setViewMode(view);
    updateUrl(activeStatus, sortBy, view, filters);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrl(activeStatus, sortBy, viewMode, newFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    updateUrl(activeStatus, sortBy, viewMode, defaultFilters);
  };

  const handleWatchlistToggle = (show: TVShowWithEpisodeStatus) => {
    watchlist.toggleItem({
      id: show.id,
      title: show.name,
      media_type: 'tv',
      content_type: 'tv',
      poster_path: show.poster_path,
    });
  };

  // Calculate active filter count
  const activeFilterCount =
    filters.genres.length +
    (filters.ratingMin ? 1 : 0) +
    (filters.language ? 1 : 0) +
    (filters.provider ? 1 : 0);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-subtle bg-bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-badge-tv/10">
              <Tv className="h-6 w-6 text-badge-tv" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                New TV Shows
              </h1>
              <p className="mt-1 text-text-secondary">
                Track currently airing shows and upcoming episodes
              </p>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleStatusChange(tab.value)}
                className={cn(
                  'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  activeStatus === tab.value
                    ? 'bg-badge-tv text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Controls Bar with auto-hide */}
      <div
        className={cn(
          'sticky top-16 z-30 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-lg transition-transform duration-300',
          isBarVisible ? 'translate-y-0' : '-translate-y-full'
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-text-tertiary">
                {isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-bg-tertiary" />
                ) : (
                  <>
                    <span className="font-medium text-text-primary">
                      {shows.length}
                    </span>{' '}
                    shows
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
                className="rounded-md border border-border-default bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center rounded-md border border-border-default bg-bg-secondary">
                <button
                  onClick={() => handleViewChange('card')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'card'
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                  aria-label="Card view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleViewChange('list')}
                  className={cn(
                    'p-2 transition-colors',
                    viewMode === 'list'
                      ? 'bg-accent-primary text-white'
                      : 'text-text-secondary hover:text-text-primary'
                  )}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden w-64 flex-shrink-0 lg:block">
            <div className="sticky top-36">
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                contentType="tv"
              />
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1">
            {isLoading ? (
              <SkeletonGrid count={12} columns={viewMode === 'list' ? 1 : 4} />
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tv className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  Something went wrong
                </h3>
                <p className="mt-2 text-text-secondary">{error}</p>
                <button
                  onClick={fetchShows}
                  className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Try again
                </button>
              </div>
            ) : shows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tv className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  No shows found
                </h3>
                <p className="mt-2 text-text-secondary">
                  Try adjusting your filters or selecting a different status.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Clear filters
                </button>
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shows.map((show, index) => (
                  <TVShowCard
                    key={show.id}
                    show={show}
                    priority={index < 8}
                    isInWatchlist={watchlistIds.has(show.id)}
                    onWatchlistToggle={handleWatchlistToggle}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {shows.map((show) => (
                  <CompactTVShowCard
                    key={show.id}
                    show={show}
                    isInWatchlist={watchlistIds.has(show.id)}
                    onWatchlistToggle={handleWatchlistToggle}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        contentType="tv"
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
