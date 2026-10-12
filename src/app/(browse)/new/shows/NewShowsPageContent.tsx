'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Tv, LayoutGrid, List, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TVShowCard, CompactTVShowCard } from '@/components/tv';
import { SkeletonGrid } from '@/components/ui';
import {
  FilterSidebar,
  defaultFilters,
  type FilterSectionKey,
  type FilterState,
} from '@/components/browse/FilterSidebar';
import { parseFilters, writeFilters, countActiveFilters, pushUrl } from '@/components/browse/filter-params';
import { MobileFilterSheet } from '@/components/browse/MobileFilterSheet';
import { useWatchlist, watchlistKey } from '@/stores/watchlist';
import { usePagedList, useScrollToResults } from '@/lib/hooks';
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

const STATUS_VALUES = STATUS_TABS.map((t) => t.value);
const SORT_VALUES = SORT_OPTIONS.map((o) => o.value);
// The API takes the minimum rating as "rating" here, not "rating_min"
const FILTER_PARAMS = { ratingParam: 'rating' };
// Filters /api/new/shows can apply to its pool of airing shows
const FILTER_SECTIONS: FilterSectionKey[] = ['genres', 'rating', 'language'];
// The API leaves News, Soap and Talk out of its pool, so these never match
const HIDDEN_GENRES = [10763, 10766, 10767];

const showKey = (show: TVShowWithEpisodeStatus) => String(show.id);

export function NewShowsPageContent() {
  const searchParams = useSearchParams();

  // Status, sort, view and filters come from the URL only (Back/Forward and
  // shared links work; they used to be read once into state)
  const searchKey = searchParams.toString();
  const { activeStatus, sortBy, viewMode, filters } = useMemo(() => {
    const params = new URLSearchParams(searchKey);
    const status = params.get('status') as ShowStatus | null;
    const sort = params.get('sort') as SortOption | null;
    return {
      activeStatus: status && STATUS_VALUES.includes(status) ? status : 'all',
      sortBy: sort && SORT_VALUES.includes(sort) ? sort : 'next_episode',
      viewMode: (params.get('view') === 'list' ? 'list' : 'card') as ViewMode,
      filters: parseFilters(params, FILTER_PARAMS),
    };
  }, [searchKey]);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => watchlistKey(item.media_type, item.id)));

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

  const buildApiUrl = useCallback(
    (pageNum: number) => {
      const params = writeFilters(new URLSearchParams(), filters, FILTER_PARAMS);
      params.set('status', activeStatus);
      params.set('sort', sortBy);
      params.set('page', String(pageNum));
      if (activeStatus === 'upcoming') {
        params.set('hasNewEpisodes', 'true');
      }
      return `/api/new/shows?${params.toString()}`;
    },
    [activeStatus, sortBy, filters]
  );

  const list = usePagedList<TVShowWithEpisodeStatus, NewShowsResponse>({
    buildUrl: buildApiUrl,
    getKey: showKey,
  });
  const shows = list.items;
  const resultsRef = useScrollToResults<HTMLElement>(buildApiUrl(1));

  // ==========================================================================
  // URL Management
  // ==========================================================================

  const updateUrl = (newStatus: ShowStatus, newSort: SortOption, newView: ViewMode, newFilters: FilterState) => {
    const params = writeFilters(new URLSearchParams(), newFilters, FILTER_PARAMS);
    if (newStatus !== 'all') {
      params.set('status', newStatus);
    }
    if (newSort !== 'next_episode') {
      params.set('sort', newSort);
    }
    if (newView !== 'card') {
      params.set('view', newView);
    }
    pushUrl('/new/shows', params);
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleStatusChange = (status: ShowStatus) => updateUrl(status, sortBy, viewMode, filters);
  const handleSortChange = (sort: SortOption) => updateUrl(activeStatus, sort, viewMode, filters);
  const handleViewChange = (view: ViewMode) => updateUrl(activeStatus, sortBy, view, filters);
  const handleFilterChange = (newFilters: FilterState) => updateUrl(activeStatus, sortBy, viewMode, newFilters);
  const handleClearFilters = () => updateUrl(activeStatus, sortBy, viewMode, defaultFilters);

  const handleWatchlistToggle = (show: TVShowWithEpisodeStatus) => {
    watchlist.toggleItem({
      id: show.id,
      title: show.name,
      media_type: 'tv',
      content_type: 'tv',
      poster_path: show.poster_path,
    });
  };

  const activeFilterCount = countActiveFilters(filters);

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
              <p className={cn('text-sm text-text-tertiary transition-opacity', list.isRefreshing && 'opacity-50')}>
                {list.isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-bg-tertiary" />
                ) : list.error === 'initial' ? null : (
                  <>
                    <span className="font-medium text-text-primary">
                      {list.totalResults}
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
                sections={FILTER_SECTIONS}
                hiddenGenres={HIDDEN_GENRES}
              />
            </div>
          </aside>

          {/* Content (the previous results stay, dimmed, while new ones load) */}
          <main
            ref={resultsRef}
            className={cn('flex-1 transition-opacity duration-200', list.isRefreshing && 'pointer-events-none opacity-50')}
            aria-busy={list.isLoading || list.isRefreshing}
          >
            {list.isLoading ? (
              <SkeletonGrid count={12} columns={viewMode === 'list' ? 1 : 4} />
            ) : list.error === 'initial' ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Tv className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  Something went wrong
                </h3>
                <p className="mt-2 text-text-secondary">Failed to load shows. Please try again.</p>
                <button
                  onClick={list.retry}
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
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shows.map((show, index) => (
                  <TVShowCard
                    key={show.id}
                    show={show}
                    priority={index < 8}
                    isInWatchlist={watchlistIds.has(watchlistKey('tv', show.id))}
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
                    isInWatchlist={watchlistIds.has(watchlistKey('tv', show.id))}
                    onWatchlistToggle={handleWatchlistToggle}
                  />
                ))}
              </div>
            )}

            {/* More pages (the API pages through its pool of airing shows) */}
            {!list.isLoading && shows.length > 0 && (list.hasMore || list.error === 'more') && (
              <div className="mt-8 flex flex-col items-center gap-3">
                {list.error === 'more' && (
                  <p className="text-sm text-text-secondary">Couldn&apos;t load more shows.</p>
                )}
                <button
                  onClick={list.error === 'more' ? list.retry : list.loadMore}
                  disabled={list.isLoadingMore}
                  className="rounded-md border border-border-default bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default disabled:opacity-60"
                >
                  {list.isLoadingMore ? 'Loading…' : list.error === 'more' ? 'Try again' : 'Load more'}
                </button>
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
        sections={FILTER_SECTIONS}
        hiddenGenres={HIDDEN_GENRES}
      />
    </div>
  );
}
