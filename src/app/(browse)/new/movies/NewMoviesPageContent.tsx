'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ContentCard } from '@/components/content/ContentCard';
import { ContentGrid, InfiniteContentGrid } from '@/components/content';
import {
  FilterSidebar,
  defaultFilters,
  type FilterSectionKey,
  type FilterState,
} from '@/components/browse/FilterSidebar';
import { parseFilters, writeFilters, countActiveFilters, pushUrl } from '@/components/browse/filter-params';
import { MobileFilterSheet } from '@/components/browse/MobileFilterSheet';
import { SortDropdown, type SortOption } from '@/components/browse/SortDropdown';
import { SkeletonGrid } from '@/components/ui';
import { useWatchlist, watchlistKey } from '@/stores/watchlist';
import { usePagedList } from '@/lib/hooks';
import { cn, formatDate } from '@/lib/utils';
import type { Content, Movie, PaginatedResponse, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type TimePeriod = 'week' | 'month' | '3months' | 'year';

interface NewMoviesResponse extends PaginatedResponse<Movie> {
  period: TimePeriod;
  date_range: {
    from: string;
    to: string;
  };
}

// ==========================================================================
// Time Period Tabs
// ==========================================================================

const TIME_PERIODS: { value: TimePeriod; label: string; description: string }[] = [
  { value: 'week', label: 'This Week', description: 'Last 7 days' },
  { value: 'month', label: 'This Month', description: 'Last 30 days' },
  { value: '3months', label: 'Last 3 Months', description: 'Last 90 days' },
  { value: 'year', label: 'This Year', description: 'Last 12 months' },
];

// ==========================================================================
// New Movies Page Content
// ==========================================================================

const PERIOD_VALUES = TIME_PERIODS.map((p) => p.value);
const SORT_VALUES: SortOption[] = ['release_date', 'popularity', 'rating', 'title'];
// The API takes the minimum rating as "rating" here, not "rating_min"
const FILTER_PARAMS = { ratingParam: 'rating' };
// Filters /api/new/movies can apply (no year: the period sets the dates)
const FILTER_SECTIONS: FilterSectionKey[] = ['genres', 'rating', 'runtime', 'language', 'provider'];

const movieKey = (movie: Movie) => String(movie.id);

export function NewMoviesPageContent() {
  const searchParams = useSearchParams();

  // Period, sort and filters come from the URL only, so the "See all" links
  // and Back/Forward work (they were read once into state and then ignored)
  const searchKey = searchParams.toString();
  const { activePeriod, sortBy, filters } = useMemo(() => {
    const params = new URLSearchParams(searchKey);
    const period = params.get('period') as TimePeriod | null;
    const sort = params.get('sort') as SortOption | null;
    return {
      activePeriod: period && PERIOD_VALUES.includes(period) ? period : 'month',
      sortBy: sort && SORT_VALUES.includes(sort) ? sort : 'release_date',
      filters: parseFilters(params, FILTER_PARAMS),
    };
  }, [searchKey]);

  // This Week data (always shown at top)
  const [thisWeekMovies, setThisWeekMovies] = useState<Movie[]>([]);
  const [isLoadingThisWeek, setIsLoadingThisWeek] = useState(true);

  // This Month data (shown when not viewing week or month)
  const [thisMonthMovies, setThisMonthMovies] = useState<Movie[]>([]);
  const [isLoadingThisMonth, setIsLoadingThisMonth] = useState(true);

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

  // Fetch "This Week" movies (always shown)
  const fetchThisWeekMovies = useCallback(async () => {
    setIsLoadingThisWeek(true);
    try {
      const response = await fetch('/api/new/movies?period=week&sort=date');
      if (!response.ok) throw new Error('Failed to fetch');
      const data: NewMoviesResponse = await response.json();
      setThisWeekMovies(data.results.slice(0, 12)); // Show max 12 in this section
    } catch (error) {
      console.error('Error fetching this week movies:', error);
    } finally {
      setIsLoadingThisWeek(false);
    }
  }, []);

  // Fetch "This Month" movies
  const fetchThisMonthMovies = useCallback(async () => {
    setIsLoadingThisMonth(true);
    try {
      const response = await fetch('/api/new/movies?period=month&sort=date');
      if (!response.ok) throw new Error('Failed to fetch');
      const data: NewMoviesResponse = await response.json();
      setThisMonthMovies(data.results.slice(0, 12)); // Show max 12 in this section
    } catch (error) {
      console.error('Error fetching this month movies:', error);
    } finally {
      setIsLoadingThisMonth(false);
    }
  }, []);

  // Build API URL for main grid
  const buildApiUrl = useCallback(
    (pageNum: number) => {
      const params = writeFilters(new URLSearchParams(), filters, FILTER_PARAMS);
      params.set('period', activePeriod);
      params.set('page', String(pageNum));
      params.set('sort', sortBy === 'release_date' ? 'date' : sortBy);
      return `/api/new/movies?${params.toString()}`;
    },
    [activePeriod, sortBy, filters]
  );

  const list = usePagedList<Movie, NewMoviesResponse>({ buildUrl: buildApiUrl, getKey: movieKey });
  const dateRange = list.firstPage?.date_range ?? null;

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Fetch "This Week" and "This Month" on mount
  useEffect(() => {
    fetchThisWeekMovies();
    fetchThisMonthMovies();
  }, [fetchThisWeekMovies, fetchThisMonthMovies]);

  // ==========================================================================
  // URL Management
  // ==========================================================================

  const updateUrl = (newPeriod: TimePeriod, newSort: SortOption, newFilters: FilterState) => {
    const params = writeFilters(new URLSearchParams(), newFilters, FILTER_PARAMS);
    if (newPeriod !== 'month') {
      params.set('period', newPeriod);
    }
    if (newSort !== 'release_date') {
      params.set('sort', newSort);
    }
    pushUrl('/new/movies', params);
  };

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handlePeriodChange = (period: TimePeriod) => updateUrl(period, sortBy, filters);
  const handleSortChange = (sort: SortOption) => updateUrl(activePeriod, sort, filters);
  const handleFilterChange = (newFilters: FilterState) => updateUrl(activePeriod, sortBy, newFilters);
  const handleClearFilters = () => updateUrl(activePeriod, sortBy, defaultFilters);

  const handleWatchlistToggle = (content: Content) => {
    const movie = content as Movie;
    watchlist.toggleItem({
      id: movie.id,
      title: movie.title,
      media_type: 'movie',
      content_type: 'movie',
      poster_path: movie.poster_path,
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
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-primary/10">
              <Calendar className="h-6 w-6 text-accent-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
                New Movie Releases
              </h1>
              <p className="mt-1 text-text-secondary">
                Discover the latest films hitting theaters and streaming
              </p>
            </div>
          </div>

          {/* Time Period Tabs */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {TIME_PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={cn(
                  'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  activePeriod === period.value
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* This Week Section - Visible when not on week tab */}
      {activePeriod !== 'week' && (
        <section className="border-b border-border-subtle bg-bg-secondary/50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                New This Week
              </h2>
              <Link
                href="/new/movies?period=week"
                className="flex items-center gap-1 text-sm text-accent-primary hover:underline"
              >
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoadingThisWeek ? (
              <SkeletonGrid count={6} columns={6} />
            ) : thisWeekMovies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {thisWeekMovies.map((movie, index) => (
                  <ContentCard
                    key={movie.id}
                    content={movie}
                    priority={index < 6}
                    showTypeBadge={false}
                    showNewBadge={true}
                    isInWatchlist={watchlistIds.has(watchlistKey('movie', movie.id))}
                    onWatchlistToggle={handleWatchlistToggle}
                  />
                ))}
              </div>
            ) : (
              <p className="text-text-tertiary">No new releases this week.</p>
            )}
          </div>
        </section>
      )}

      {/* This Month Section - Visible when viewing 3months or year */}
      {(activePeriod === '3months' || activePeriod === 'year') && (
        <section className="border-b border-border-subtle bg-bg-secondary/30">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-primary">
                New This Month
              </h2>
              <Link
                href="/new/movies?period=month"
                className="flex items-center gap-1 text-sm text-accent-primary hover:underline"
              >
                See all
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoadingThisMonth ? (
              <SkeletonGrid count={6} columns={6} />
            ) : thisMonthMovies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {thisMonthMovies.map((movie, index) => (
                  <ContentCard
                    key={movie.id}
                    content={movie}
                    priority={false}
                    showTypeBadge={false}
                    showNewBadge={true}
                    isInWatchlist={watchlistIds.has(watchlistKey('movie', movie.id))}
                    onWatchlistToggle={handleWatchlistToggle}
                  />
                ))}
              </div>
            ) : (
              <p className="text-text-tertiary">No new releases this month.</p>
            )}
          </div>
        </section>
      )}

      {/* Sticky Sort/Filter Bar with auto-hide */}
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
                {list.isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-bg-tertiary" />
                ) : list.error ? null : (
                  <>
                    <span className="font-medium text-text-primary">
                      {list.totalResults.toLocaleString()}
                    </span>{' '}
                    movies
                    {dateRange && (
                      <span className="hidden sm:inline">
                        {' '}
                        from {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <SortDropdown value={sortBy} onChange={handleSortChange} />
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
                contentType="movie"
                sections={FILTER_SECTIONS}
              />
            </div>
          </aside>

          {/* Content Grid */}
          <main className="flex-1">
            <InfiniteContentGrid
              items={list.items}
              columns={5}
              showTypeBadge={false}
              isLoading={list.isLoading}
              loadingCount={20}
              hasMore={list.hasMore}
              onLoadMore={list.loadMore}
              isLoadingMore={list.isLoadingMore}
              error={list.error}
              onRetry={list.retry}
              watchlistIds={watchlistIds}
              onWatchlistToggle={handleWatchlistToggle}
              currentPage={list.page}
              emptyState={
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calendar className="h-16 w-16 text-text-tertiary" />
                  <h3 className="mt-4 text-lg font-semibold text-text-primary">
                    No movies found
                  </h3>
                  <p className="mt-2 text-text-secondary">
                    Try adjusting your filters or selecting a different time period.
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
              }
            />
          </main>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        contentType="movie"
        activeFilterCount={activeFilterCount}
        sections={FILTER_SECTIONS}
      />
    </div>
  );
}
