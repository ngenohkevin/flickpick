'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterSidebar, defaultFilters, type FilterState } from './FilterSidebar';
import { parseFilters, writeFilters, countActiveFilters, pushUrl } from './filter-params';
import { SortDropdown, type SortOption } from './SortDropdown';
import { MobileFilterSheet } from './MobileFilterSheet';
import { InfiniteContentGrid } from '@/components/content';
import { useWatchlist, watchlistKey, contentWatchlistKey } from '@/stores/watchlist';
import { useScrollRestoration, usePagedList } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { Content, ContentType, WatchlistItem } from '@/types';

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

const SORT_OPTIONS: SortOption[] = ['popularity', 'rating', 'release_date', 'title'];

/** Movies and TV shows share TMDB's ID space: dedupe on type + id. */
const itemKey = (item: Content) => contentWatchlistKey(item);

export function BrowsePage({ contentType, title, description }: BrowsePageProps) {
  const searchParams = useSearchParams();
  const pathname = contentType === 'movie' ? '/movies' : `/${contentType}`;

  // Filters and sort come from the URL only, so links, Back/Forward and
  // shared URLs show the right results. (Reading them once into state made
  // the page ignore every URL change after the first render.)
  const searchKey = searchParams.toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(searchKey)), [searchKey]);
  const sortBy = useMemo<SortOption>(() => {
    const raw = new URLSearchParams(searchKey).get('sort_by') as SortOption | null;
    return raw && SORT_OPTIONS.includes(raw) ? raw : 'popularity';
  }, [searchKey]);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => watchlistKey(item.media_type, item.id)));

  const buildApiUrl = useCallback(
    (pageNum: number) => {
      const params = writeFilters(new URLSearchParams({ page: String(pageNum) }), filters);
      params.set('sort_by', sortBy);
      // Map content type to API type
      const apiType = contentType === 'movie' ? 'movies' : contentType;
      return `/api/browse/${apiType}?${params.toString()}`;
    },
    [contentType, filters, sortBy]
  );

  const list = usePagedList<Content>({ buildUrl: buildApiUrl, getKey: itemKey });

  // Scroll restoration: refetches the pages that were loaded before leaving
  useScrollRestoration({
    loadedPages: list.page,
    onRestorePages: list.restoreTo,
  });

  // Update URL (the list refetches when the derived filters change)
  const updateUrl = (newFilters: FilterState, newSort: SortOption) => {
    const params = writeFilters(new URLSearchParams(), newFilters);
    if (newSort !== 'popularity') {
      params.set('sort_by', newSort);
    }
    pushUrl(pathname, params);
  };

  const handleFilterChange = (newFilters: FilterState) => updateUrl(newFilters, sortBy);
  const handleSortChange = (newSort: SortOption) => updateUrl(filters, newSort);
  const handleClearFilters = () => updateUrl(defaultFilters, sortBy);

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

  const activeFilterCount = countActiveFilters(filters);

  // Scroll-to-hide for page header (syncs with navigation bar)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollThreshold = 50;

      if (currentScrollY < scrollThreshold) {
        setIsHeaderHidden(false);
      } else if (currentScrollY > lastScrollY.current) {
        setIsHeaderHidden(true);
      } else if (currentScrollY < lastScrollY.current) {
        setIsHeaderHidden(false);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
              <h1 className="text-xl font-bold text-text-primary sm:text-2xl md:text-3xl">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-text-secondary sm:text-base">{description}</p>
              )}
              {!list.isLoading && !list.error && (
                <p className="mt-1 text-xs text-text-tertiary sm:text-sm">
                  {list.totalResults.toLocaleString()} results
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
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div
              className={cn(
                'sticky overflow-y-auto overscroll-contain scrollbar-thin transition-all duration-300',
                isHeaderHidden ? 'top-4 h-[calc(100vh-2rem)]' : 'top-[88px] h-[calc(100vh-112px)]'
              )}
            >
              <div className="pb-6 pr-2">
                <FilterSidebar
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  contentType={contentType === 'animation' || contentType === 'anime' ? 'movie' : contentType}
                />
              </div>
            </div>
          </aside>

          {/* Content Grid */}
          <main className="flex-1">
            <InfiniteContentGrid
              items={list.items}
              columns={5}
              showTypeBadge={contentType === 'animation' || contentType === 'anime'}
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
