'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { FilterSidebar, ALL_FILTER_SECTIONS, defaultFilters, type FilterSectionKey, type FilterState } from './FilterSidebar';
import { parseFilters, writeFilters, countActiveFilters, pushUrl } from './filter-params';
import { SortDropdown, type SortOption } from './SortDropdown';
import { MobileFilterSheet } from './MobileFilterSheet';
import { InfiniteContentGrid } from '@/components/content';
import { useWatchlist, watchlistKey, contentWatchlistKey } from '@/stores/watchlist';
import { useScrollRestoration, usePagedList, useScrollToResults, useWatchRegion } from '@/lib/hooks';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
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

interface FilterConfig {
  sections: readonly FilterSectionKey[];
  hiddenGenres?: readonly number[];
  hiddenLanguages?: readonly string[];
  genreMatch: 'any' | 'all';
}

// Animation and anime always require the Animation genre (so it isn't
// offered), and TMDB can only AND further genres onto it. Anime is
// Japanese-language by definition; animation leaves Japanese titles to anime.
const FILTER_CONFIG: Record<ContentType, FilterConfig> = {
  movie: { sections: ALL_FILTER_SECTIONS, genreMatch: 'any' },
  tv: { sections: ALL_FILTER_SECTIONS, genreMatch: 'any' },
  animation: {
    sections: ALL_FILTER_SECTIONS,
    hiddenGenres: [ANIMATION_GENRE_ID],
    hiddenLanguages: ['ja'],
    genreMatch: 'all',
  },
  anime: {
    sections: ALL_FILTER_SECTIONS.filter((section) => section !== 'language'),
    hiddenGenres: [ANIMATION_GENRE_ID],
    genreMatch: 'all',
  },
};

/** Movies and TV shows share TMDB's ID space: dedupe on type + id. */
const itemKey = (item: Content) => contentWatchlistKey(item);

export function BrowsePage({ contentType, title, description }: BrowsePageProps) {
  const searchParams = useSearchParams();
  const pathname = contentType === 'movie' ? '/movies' : `/${contentType}`;
  const filterConfig = FILTER_CONFIG[contentType];
  // Streaming filters use the country title pages show providers for
  const watchRegion = useWatchRegion();

  // Filters and sort come from the URL only, so links, Back/Forward and
  // shared URLs show the right results. (Reading them once into state made
  // the page ignore every URL change after the first render.)
  const searchKey = searchParams.toString();
  const filters = useMemo(() => {
    const parsed = parseFilters(new URLSearchParams(searchKey));
    // Values the page doesn't offer (?language= on /anime, ?exclude_genre=16
    // on /animation) would only empty the list, so they aren't applied
    const { sections, hiddenGenres = [], hiddenLanguages = [] } = filterConfig;
    const offeredLanguage =
      sections.includes('language') && !(parsed.language && hiddenLanguages.includes(parsed.language));
    return {
      ...parsed,
      genres: parsed.genres.filter((id) => !hiddenGenres.includes(id)),
      excludedGenres: parsed.excludedGenres.filter((id) => !hiddenGenres.includes(id)),
      language: offeredLanguage ? parsed.language : null,
    };
  }, [searchKey, filterConfig]);
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
      if (filters.provider) params.set('watch_region', watchRegion);
      // Map content type to API type
      const apiType = contentType === 'movie' ? 'movies' : contentType;
      return `/api/browse/${apiType}?${params.toString()}`;
    },
    [contentType, filters, sortBy, watchRegion]
  );

  const list = usePagedList<Content>({ buildUrl: buildApiUrl, getKey: itemKey });
  const resultsRef = useScrollToResults<HTMLElement>(buildApiUrl(1));

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
              {/* Always rendered, so the header keeps its height while loading */}
              <p
                className={cn(
                  'mt-1 text-xs text-text-tertiary transition-opacity sm:text-sm',
                  list.isRefreshing && 'opacity-50'
                )}
              >
                {list.isLoading || list.error ? '\u00a0' : `${list.totalResults.toLocaleString()} results`}
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
                  sections={filterConfig.sections}
                  hiddenGenres={filterConfig.hiddenGenres}
                  hiddenLanguages={filterConfig.hiddenLanguages}
                  genreMatch={filterConfig.genreMatch}
                />
              </div>
            </div>
          </aside>

          {/* Content Grid */}
          <main ref={resultsRef} className="flex-1">
            <InfiniteContentGrid
              items={list.items}
              isRefreshing={list.isRefreshing}
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
        sections={filterConfig.sections}
        hiddenGenres={filterConfig.hiddenGenres}
        hiddenLanguages={filterConfig.hiddenLanguages}
        genreMatch={filterConfig.genreMatch}
      />
    </div>
  );
}
