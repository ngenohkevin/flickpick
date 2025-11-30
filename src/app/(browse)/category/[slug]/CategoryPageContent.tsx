'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { useWatchlist } from '@/stores/watchlist';
import { CURATED_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Content, PaginatedResponse, Category, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface CategoryPageContentProps {
  category: Category;
}

interface CategoryResponse extends PaginatedResponse<Content> {
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

export function CategoryPageContent({ category }: CategoryPageContentProps) {
  const [filter, setFilter] = useState<ContentFilter>('all');
  const [items, setItems] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => item.id));

  // Get icon for this category
  const Icon = CATEGORY_ICONS[category.slug] || Sparkles;

  // Fetch content
  const fetchContent = useCallback(
    async (pageNum: number, append: boolean = false) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          type: filter,
        });

        const response = await fetch(`/api/category/${category.slug}?${params}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data: CategoryResponse = await response.json();

        if (append) {
          setItems((prev) => [...prev, ...data.results]);
        } else {
          setItems(data.results);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
      } catch (error) {
        console.error('Error fetching category content:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [category.slug, filter]
  );

  // Initial fetch and refetch on filter change
  useEffect(() => {
    setPage(1);
    fetchContent(1, false);
  }, [fetchContent]);

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
              {!isLoading && (
                <p className="mt-2 text-sm text-text-tertiary">
                  {totalResults.toLocaleString()} titles
                </p>
              )}
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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InfiniteContentGrid
          items={items}
          columns={6}
          showTypeBadge={filter === 'all'}
          isLoading={isLoading}
          loadingCount={24}
          hasMore={page < totalPages}
          onLoadMore={handleLoadMore}
          isLoadingMore={isLoadingMore}
          watchlistIds={watchlistIds}
          onWatchlistToggle={handleWatchlistToggle}
        />
      </div>
    </div>
  );
}
