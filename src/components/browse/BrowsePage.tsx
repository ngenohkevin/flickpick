'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilterSidebar, defaultFilters, type FilterState } from './FilterSidebar';
import { SortDropdown, type SortOption } from './SortDropdown';
import { MobileFilterSheet } from './MobileFilterSheet';
import { InfiniteContentGrid } from '@/components/content';
import { useWatchlist } from '@/stores/watchlist';
import { cn } from '@/lib/utils';
import type { Content, ContentType, PaginatedResponse, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface BrowsePageProps {
  contentType: ContentType;
  title: string;
  description?: string;
}

// ==========================================================================
// Browse Page Component
// Reusable browse page with filters, sorting, and infinite scroll
// ==========================================================================

export function BrowsePage({ contentType, title, description }: BrowsePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse initial filters from URL
  const parseFiltersFromUrl = useCallback((): FilterState => {
    const genreParam = searchParams.get('genre');
    return {
      genres: genreParam ? genreParam.split(',').map(Number) : [],
      yearFrom: searchParams.get('year_from') ? parseInt(searchParams.get('year_from')!, 10) : null,
      yearTo: searchParams.get('year_to') ? parseInt(searchParams.get('year_to')!, 10) : null,
      ratingMin: searchParams.get('rating_min') ? parseFloat(searchParams.get('rating_min')!) : null,
      language: searchParams.get('language') ?? null,
      provider: searchParams.get('provider') ?? null,
    };
  }, [searchParams]);

  const parseSortFromUrl = useCallback((): SortOption => {
    return (searchParams.get('sort_by') as SortOption) ?? 'popularity';
  }, [searchParams]);

  // State
  const [filters, setFilters] = useState<FilterState>(parseFiltersFromUrl);
  const [sortBy, setSortBy] = useState<SortOption>(parseSortFromUrl);
  const [items, setItems] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => item.id));

  // Build API URL with filters
  const buildApiUrl = useCallback(
    (pageNum: number) => {
      const params = new URLSearchParams();
      params.set('page', String(pageNum));

      if (filters.genres.length > 0) {
        params.set('genre', filters.genres.join(','));
      }
      if (filters.yearFrom) {
        params.set('year_from', String(filters.yearFrom));
      }
      if (filters.yearTo) {
        params.set('year_to', String(filters.yearTo));
      }
      if (filters.ratingMin) {
        params.set('rating_min', String(filters.ratingMin));
      }
      if (filters.language) {
        params.set('language', filters.language);
      }
      if (filters.provider) {
        params.set('provider', filters.provider);
      }
      params.set('sort_by', sortBy);

      // Map content type to API type
      const apiType = contentType === 'movie' ? 'movies' : contentType;
      return `/api/browse/${apiType}?${params.toString()}`;
    },
    [contentType, filters, sortBy]
  );

  // Update URL with current filters
  const updateUrl = useCallback(
    (newFilters: FilterState, newSort: SortOption) => {
      const params = new URLSearchParams();

      if (newFilters.genres.length > 0) {
        params.set('genre', newFilters.genres.join(','));
      }
      if (newFilters.yearFrom) {
        params.set('year_from', String(newFilters.yearFrom));
      }
      if (newFilters.yearTo) {
        params.set('year_to', String(newFilters.yearTo));
      }
      if (newFilters.ratingMin) {
        params.set('rating_min', String(newFilters.ratingMin));
      }
      if (newFilters.language) {
        params.set('language', newFilters.language);
      }
      if (newFilters.provider) {
        params.set('provider', newFilters.provider);
      }
      if (newSort !== 'popularity') {
        params.set('sort_by', newSort);
      }

      const queryString = params.toString();
      const pathname = contentType === 'movie' ? '/movies' : `/${contentType}`;
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        router.push(newUrl, { scroll: false });
      });
    },
    [contentType, router]
  );

  // Fetch content
  const fetchContent = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const response = await fetch(buildApiUrl(pageNum));
        if (!response.ok) throw new Error('Failed to fetch');

        const data: PaginatedResponse<Content> = await response.json();

        if (append) {
          setItems((prev) => [...prev, ...data.results]);
        } else {
          setItems(data.results);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
      } catch (error) {
        console.error('Error fetching content:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [buildApiUrl]
  );

  // Initial fetch and refetch when filters change
  useEffect(() => {
    setPage(1);
    fetchContent(1, false);
  }, [fetchContent]);

  // Handle filter change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrl(newFilters, sortBy);
  };

  // Handle sort change
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    updateUrl(filters, newSort);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(defaultFilters);
    updateUrl(defaultFilters, sortBy);
  };

  // Handle load more
  const handleLoadMore = () => {
    if (page < totalPages && !isLoadingMore) {
      fetchContent(page + 1, true);
    }
  };

  // Handle watchlist toggle
  const handleWatchlistToggle = (content: Content) => {
    const title = 'title' in content ? content.title : content.name;
    const mediaType = 'title' in content ? 'movie' : 'tv';

    watchlist.toggleItem({
      id: content.id,
      title,
      media_type: mediaType,
      content_type: contentType,
      poster_path: content.poster_path,
    });
  };

  // Calculate active filter count
  const activeFilterCount =
    filters.genres.length +
    (filters.yearFrom || filters.yearTo ? 1 : 0) +
    (filters.ratingMin ? 1 : 0) +
    (filters.provider ? 1 : 0);

  // Scroll-to-hide for page header (syncs with navigation bar)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50;

      if (currentScrollY < scrollThreshold) {
        setIsHeaderHidden(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
        setIsHeaderHidden(true);
      } else if (currentScrollY < lastScrollY) {
        setIsHeaderHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header - hides on scroll down */}
      <div
        className={cn(
          'border-b border-border-subtle bg-bg-primary/80 backdrop-blur-lg sticky top-0 z-30 transition-transform duration-300',
          isHeaderHidden && '-translate-y-full'
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">{title}</h1>
              {description && (
                <p className="mt-1 text-text-secondary">{description}</p>
              )}
              {!isLoading && (
                <p className="mt-1 text-sm text-text-tertiary">
                  {totalResults.toLocaleString()} results
                </p>
              )}
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
            <div className={cn('sticky transition-all duration-300', isHeaderHidden ? 'top-4' : 'top-24')}>
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                contentType={contentType === 'animation' || contentType === 'anime' ? 'movie' : contentType}
              />
            </div>
          </aside>

          {/* Content Grid */}
          <main className="flex-1">
            <InfiniteContentGrid
              items={items}
              columns={5}
              showTypeBadge={contentType === 'animation' || contentType === 'anime'}
              isLoading={isLoading}
              loadingCount={20}
              hasMore={page < totalPages}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore}
              watchlistIds={watchlistIds}
              onWatchlistToggle={handleWatchlistToggle}
            />
          </main>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        contentType={contentType === 'animation' || contentType === 'anime' ? 'movie' : contentType}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
