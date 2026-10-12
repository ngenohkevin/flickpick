'use client';

import { useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Sparkles,
  Star,
  Gem,
  Trophy,
  Film,
  Users,
  Globe,
} from 'lucide-react';
import { InfiniteContentGrid } from '@/components/content';
import { useWatchlist, watchlistKey, contentWatchlistKey } from '@/stores/watchlist';
import { usePagedList, useScrollRestoration, useScrollToResults } from '@/lib/hooks';
import { pushUrl } from '@/components/browse/filter-params';
import { trackCategoryView } from '@/lib/analytics';
import { CURATED_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Content, Category, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface CategoryPageContentProps {
  category: Category;
}

type ContentFilter = 'all' | 'movie' | 'tv';

// ==========================================================================
// Icon Mapping
// ==========================================================================

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  trending: TrendingUp,
  'new-releases': Sparkles,
  'top-rated': Star,
  'hidden-gems': Gem,
  'award-winners': Trophy,
  classics: Film,
  'family-friendly': Users,
  international: Globe,
};

// ==========================================================================
// Category Page Content Component
// ==========================================================================

const FILTER_VALUES: ContentFilter[] = ['all', 'movie', 'tv'];

/** Movies and TV shows share TMDB's ID space: dedupe on type + id. */
const itemKey = (item: Content) => contentWatchlistKey(item);

export function CategoryPageContent({ category }: CategoryPageContentProps) {
  // The Movies/TV tab lives in the URL so Back returns to the same tab
  const searchParams = useSearchParams();
  const rawFilter = searchParams.get('type') as ContentFilter | null;
  const filter: ContentFilter = rawFilter && FILTER_VALUES.includes(rawFilter) ? rawFilter : 'all';

  const setFilter = (value: ContentFilter) => {
    pushUrl(`/category/${category.slug}`, new URLSearchParams(value === 'all' ? {} : { type: value }));
  };

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => watchlistKey(item.media_type, item.id)));

  // Get icon for this category
  const Icon = CATEGORY_ICONS[category.slug] || Sparkles;

  const buildUrl = useCallback(
    (pageNum: number) =>
      `/api/category/${category.slug}?${new URLSearchParams({ page: String(pageNum), type: filter })}`,
    [category.slug, filter]
  );

  const list = usePagedList<Content>({ buildUrl, getKey: itemKey });
  const resultsRef = useScrollToResults(buildUrl(1));

  useScrollRestoration({ loadedPages: list.page, onRestorePages: list.restoreTo });

  // Track each category viewed (category links reuse this component, so a
  // once-only flag skipped every category after the first)
  const trackedSlug = useRef<string | null>(null);
  useEffect(() => {
    if (trackedSlug.current !== category.slug) {
      trackCategoryView(category.slug);
      trackedSlug.current = category.slug;
    }
  }, [category.slug]);

  // Handle watchlist toggle
  const handleWatchlistToggle = (content: Content) => {
    const title = 'title' in content ? content.title : content.name;
    const mediaType = 'title' in content ? 'movie' : 'tv';

    watchlist.toggleItem({
      id: content.id,
      title,
      media_type: mediaType,
      content_type: mediaType,
      poster_path: content.poster_path,
    });
  };

  // Filter tabs - some categories only make sense for movies
  const showFilters = !['classics'].includes(category.slug);

  const filterTabs = [
    { value: 'all', label: 'All' },
    { value: 'movie', label: 'Movies' },
    { value: 'tv', label: 'TV Shows' },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Header */}
      <div className="border-b border-border-subtle bg-gradient-to-b from-bg-secondary to-bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <Icon className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
                {category.name}
              </h1>
              <p className="mt-2 max-w-2xl text-text-secondary">
                {category.description}
              </p>
              {/* Always rendered, so the header keeps its height while loading */}
              <p className={`mt-2 text-sm text-text-tertiary transition-opacity ${list.isRefreshing ? 'opacity-50' : ''}`}>
                {list.isLoading || list.error ? '\u00a0' : `${list.totalResults.toLocaleString()} titles`}
              </p>
            </div>
          </div>

          {/* Filter Tabs */}
          {showFilters && (
            <div className="mt-6 flex gap-1 rounded-lg bg-bg-tertiary p-1 w-fit">
              {filterTabs.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value as ContentFilter)}
                  className={cn(
                    'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                    filter === tab.value
                      ? 'bg-bg-secondary text-text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-secondary/50'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Other Categories */}
          <div className="mt-6 flex flex-wrap gap-2">
            {CURATED_CATEGORIES.filter((c) => c.slug !== category.slug)
              .slice(0, 6)
              .map((cat) => {
                const CatIcon = CATEGORY_ICONS[cat.slug] || Sparkles;
                return (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className={cn(
                      'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                      'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
                    )}
                  >
                    <CatIcon className="h-4 w-4" />
                    {cat.name}
                  </Link>
                );
              })}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div ref={resultsRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InfiniteContentGrid
          items={list.items}
          isRefreshing={list.isRefreshing}
          columns={6}
          showTypeBadge={filter === 'all'}
          isLoading={list.isLoading}
          loadingCount={24}
          hasMore={list.hasMore}
          onLoadMore={list.loadMore}
          isLoadingMore={list.isLoadingMore}
          error={list.error}
          onRetry={list.retry}
          watchlistIds={watchlistIds}
          onWatchlistToggle={handleWatchlistToggle}
          currentPage={list.page}
        />
      </div>
    </div>
  );
}
