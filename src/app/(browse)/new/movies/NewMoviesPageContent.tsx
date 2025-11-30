'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, Filter, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ContentCard } from '@/components/content/ContentCard';
import { ContentGrid, InfiniteContentGrid } from '@/components/content';
import { FilterSidebar, defaultFilters, type FilterState } from '@/components/browse/FilterSidebar';
import { MobileFilterSheet } from '@/components/browse/MobileFilterSheet';
import { SortDropdown, type SortOption } from '@/components/browse/SortDropdown';
import { SkeletonGrid } from '@/components/ui';
import { useWatchlist } from '@/stores/watchlist';
import { cn } from '@/lib/utils';
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

export function NewMoviesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse initial values from URL
  const initialPeriod = (searchParams.get('period') as TimePeriod) ?? 'month';
  const initialSort = (searchParams.get('sort') as SortOption) ?? 'release_date';

  // State
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(initialPeriod);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);
  const [filters, setFilters] = useState<FilterState>(() => ({
    genres: searchParams.get('genre') ? searchParams.get('genre')!.split(',').map(Number) : [],
    yearFrom: null,
    yearTo: null,
    ratingMin: searchParams.get('rating') ? parseFloat(searchParams.get('rating')!) : null,
    language: searchParams.get('language') ?? null,
    provider: searchParams.get('provider') ?? null,
  }));

  // This Week data (always shown at top)
  const [thisWeekMovies, setThisWeekMovies] = useState<Movie[]>([]);
  const [isLoadingThisWeek, setIsLoadingThisWeek] = useState(true);

  // This Month data (shown when not viewing week or month)
  const [thisMonthMovies, setThisMonthMovies] = useState<Movie[]>([]);
  const [isLoadingThisMonth, setIsLoadingThisMonth] = useState(true);

  // Main grid data (based on selected period)
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => item.id));

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
      const params = new URLSearchParams();
      params.set('period', activePeriod);
      params.set('page', String(pageNum));
      params.set('sort', sortBy === 'release_date' ? 'date' : sortBy);

      if (filters.genres.length > 0) {
        params.set('genre', filters.genres.join(','));
      }
      if (filters.ratingMin) {
        params.set('rating', String(filters.ratingMin));
      }
      if (filters.language) {
        params.set('language', filters.language);
      }
      if (filters.provider) {
        params.set('provider', filters.provider);
      }

      return `/api/new/movies?${params.toString()}`;
    },
    [activePeriod, sortBy, filters]
  );

  // Fetch main grid data
  const fetchMovies = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await fetch(buildApiUrl(pageNum));
        if (!response.ok) throw new Error('Failed to fetch');
        const data: NewMoviesResponse = await response.json();

        if (append) {
          setMovies((prev) => [...prev, ...data.results]);
        } else {
          setMovies(data.results);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
        setDateRange(data.date_range);
      } catch (error) {
        console.error('Error fetching movies:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildApiUrl]
  );

  // ==========================================================================
  // Effects
  // ==========================================================================

  // Fetch "This Week" and "This Month" on mount
  useEffect(() => {
    fetchThisWeekMovies();
    fetchThisMonthMovies();
  }, [fetchThisWeekMovies, fetchThisMonthMovies]);

  // Fetch main grid when filters/period change
  useEffect(() => {
    setPage(1);
    fetchMovies(1, false);
  }, [fetchMovies]);

  // ==========================================================================
  // URL Management
  // ==========================================================================

  const updateUrl = useCallback(
    (newPeriod: TimePeriod, newSort: SortOption, newFilters: FilterState) => {
      const params = new URLSearchParams();

      if (newPeriod !== 'month') {
        params.set('period', newPeriod);
      }
      if (newSort !== 'release_date') {
        params.set('sort', newSort);
      }
      if (newFilters.genres.length > 0) {
        params.set('genre', newFilters.genres.join(','));
      }
      if (newFilters.ratingMin) {
        params.set('rating', String(newFilters.ratingMin));
      }
      if (newFilters.language) {
        params.set('language', newFilters.language);
      }
      if (newFilters.provider) {
        params.set('provider', newFilters.provider);
      }

      const queryString = params.toString();
      const newUrl = queryString ? `/new/movies?${queryString}` : '/new/movies';
      router.push(newUrl, { scroll: false });
    },
    [router]
  );

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handlePeriodChange = (period: TimePeriod) => {
    setActivePeriod(period);
    updateUrl(period, sortBy, filters);
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    updateUrl(activePeriod, sort, filters);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrl(activePeriod, sortBy, newFilters);
  };

  const handleClearFilters = () => {
    setFilters(defaultFilters);
    updateUrl(activePeriod, sortBy, defaultFilters);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      fetchMovies(page + 1, true);
    }
  };

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
                    isInWatchlist={watchlistIds.has(movie.id)}
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
                    isInWatchlist={watchlistIds.has(movie.id)}
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

      {/* Sticky Sort/Filter Bar */}
      <div className="sticky top-16 z-30 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <p className="text-sm text-text-tertiary">
                {isLoading ? (
                  <span className="inline-block h-4 w-24 animate-pulse rounded bg-bg-tertiary" />
                ) : (
                  <>
                    <span className="font-medium text-text-primary">
                      {totalResults.toLocaleString()}
                    </span>{' '}
                    movies
                    {dateRange && (
                      <span className="hidden sm:inline">
                        {' '}
                        from {new Date(dateRange.from).toLocaleDateString()} -{' '}
                        {new Date(dateRange.to).toLocaleDateString()}
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
              />
            </div>
          </aside>

          {/* Content Grid */}
          <main className="flex-1">
            <InfiniteContentGrid
              items={movies}
              columns={5}
              showTypeBadge={false}
              isLoading={isLoading}
              loadingCount={20}
              hasMore={page < totalPages}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              watchlistIds={watchlistIds}
              onWatchlistToggle={handleWatchlistToggle}
            />

            {!isLoading && movies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Calendar className="h-16 w-16 text-text-tertiary" />
                <h3 className="mt-4 text-lg font-semibold text-text-primary">
                  No movies found
                </h3>
                <p className="mt-2 text-text-secondary">
                  Try adjusting your filters or selecting a different time period.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover"
                >
                  Clear filters
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
        contentType="movie"
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
