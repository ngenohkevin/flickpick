'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, TrendingUp, Star } from 'lucide-react';
import { InfiniteContentGrid, ContentRow } from '@/components/content';
import { SortDropdown, type SortOption } from '@/components/browse';
import { pushUrl } from '@/components/browse/filter-params';
import { useWatchlist, watchlistKey } from '@/stores/watchlist';
import { usePagedList, useScrollRestoration, useScrollToResults } from '@/lib/hooks';
import { MOVIE_GENRES, TV_GENRES, GENRE_SLUGS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Content, PaginatedResponse, Genre, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface GenrePageContentProps {
  genreId: number;
  genreName: string;
  type: 'movie' | 'tv';
  typeLabel: string;
  description: string;
}

interface GenreResponse extends PaginatedResponse<Content> {
  genre: Genre;
  type: 'movie' | 'tv';
}

// ==========================================================================
// Genre Page Content Component
// ==========================================================================

const SORT_OPTIONS: SortOption[] = ['popularity', 'rating', 'release_date', 'title'];

const itemKey = (item: Content) => String(item.id);

export function GenrePageContent({
  genreId,
  genreName,
  type,
  typeLabel,
  description,
}: GenrePageContentProps) {
  // Sort lives in the URL so Back returns to the same ordering
  const searchParams = useSearchParams();
  const rawSort = searchParams.get('sort_by') as SortOption | null;
  const sortBy: SortOption = rawSort && SORT_OPTIONS.includes(rawSort) ? rawSort : 'popularity';
  const setSortBy = (value: SortOption) => {
    pushUrl(window.location.pathname, new URLSearchParams(value === 'popularity' ? {} : { sort_by: value }));
  };

  // Trending and Top Rated content for featured sections
  const [trendingItems, setTrendingItems] = useState<Content[]>([]);
  const [topRatedItems, setTopRatedItems] = useState<Content[]>([]);
  const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => watchlistKey(item.media_type, item.id)));

  // Get other genres for quick navigation
  const genreList = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const otherGenres = Object.entries(genreList)
    .filter(([id]) => parseInt(id, 10) !== genreId)
    .slice(0, 8);

  const buildUrl = useCallback(
    (pageNum: number) =>
      `/api/genre/${type}/${genreId}?${new URLSearchParams({ page: String(pageNum), sort_by: sortBy })}`,
    [genreId, type, sortBy]
  );

  const list = usePagedList<Content>({ buildUrl, getKey: itemKey });
  const resultsRef = useScrollToResults(buildUrl(1));

  useScrollRestoration({ loadedPages: list.page, onRestorePages: list.restoreTo });

  // Fetch featured content (trending and top rated) when the genre changes
  useEffect(() => {
    // Genre links reuse this component: ignore a slow response for the
    // previous genre
    let cancelled = false;
    async function fetchFeaturedContent() {
      setIsFeaturedLoading(true);
      try {
        // Fetch trending (sorted by popularity) and top rated in parallel
        const [trendingRes, topRatedRes] = await Promise.all([
          fetch(`/api/genre/${type}/${genreId}?page=1&sort_by=popularity`),
          fetch(`/api/genre/${type}/${genreId}?page=1&sort_by=rating`),
        ]);

        const trendingData: GenreResponse | null = trendingRes.ok ? await trendingRes.json() : null;
        const topRatedData: GenreResponse | null = topRatedRes.ok ? await topRatedRes.json() : null;
        if (cancelled) return;
        setTrendingItems(trendingData?.results.slice(0, 10) ?? []);
        setTopRatedItems(topRatedData?.results.slice(0, 10) ?? []);
      } catch (error) {
        console.error('Error fetching featured content:', error);
      } finally {
        if (!cancelled) setIsFeaturedLoading(false);
      }
    }

    fetchFeaturedContent();
    return () => {
      cancelled = true;
    };
  }, [genreId, type]);

  // Handle watchlist toggle
  const handleWatchlistToggle = (content: Content) => {
    const title = 'title' in content ? content.title : content.name;

    watchlist.toggleItem({
      id: content.id,
      title,
      media_type: type,
      content_type: type,
      poster_path: content.poster_path,
    });
  };

  // Get slug for genre
  const getGenreSlug = (id: number): string => {
    const entry = Object.entries(GENRE_SLUGS).find(([, gId]) => gId === id);
    return entry ? entry[0] : String(id);
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Header */}
      <div className="border-b border-border-subtle bg-gradient-to-b from-bg-secondary to-bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-text-tertiary">
            <Link href={type === 'movie' ? '/movies' : '/tv'} className="hover:text-text-primary">
              {typeLabel}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-text-primary">{genreName}</span>
          </nav>

          <div>
            <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
              {genreName} {typeLabel}
            </h1>
            <p className="mt-2 max-w-2xl text-text-secondary">{description}</p>
            {/* Always rendered, so the header keeps its height while loading */}
            <p className={`mt-2 text-sm text-text-tertiary transition-opacity ${list.isRefreshing ? 'opacity-50' : ''}`}>
              {list.isLoading || list.error ? '\u00a0' : `${list.totalResults.toLocaleString()} titles`}
            </p>
          </div>

          {/* Quick Genre Navigation */}
          <div className="mt-6 flex flex-wrap gap-2">
            {otherGenres.map(([id, name]) => (
              <Link
                key={id}
                href={`/genre/${type}/${getGenreSlug(parseInt(id, 10))}`}
                className={cn(
                  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
                )}
              >
                {name}
              </Link>
            ))}
            <Link
              href={type === 'movie' ? '/movies' : '/tv'}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-accent-primary hover:underline"
            >
              View all genres →
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Sections */}
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {/* Trending in Genre */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent-primary" />
            <h2 className="text-xl font-semibold text-text-primary">
              Trending in {genreName}
            </h2>
          </div>
          <ContentRow
            title=""
            items={trendingItems}
            showViewAll={false}
            showTypeBadge={false}
            isLoading={isFeaturedLoading}
            loadingCount={6}
            watchlistIds={watchlistIds}
            onWatchlistToggle={handleWatchlistToggle}
          />
        </section>

        {/* Top Rated in Genre */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-warning" />
            <h2 className="text-xl font-semibold text-text-primary">
              Top Rated {genreName}
            </h2>
          </div>
          <ContentRow
            title=""
            items={topRatedItems}
            showViewAll={false}
            showTypeBadge={false}
            isLoading={isFeaturedLoading}
            loadingCount={6}
            watchlistIds={watchlistIds}
            onWatchlistToggle={handleWatchlistToggle}
          />
        </section>
      </div>

      {/* Full Content Grid */}
      <div className="border-t border-border-subtle">
        <div ref={resultsRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary">
              Browse All {genreName} {typeLabel}
            </h2>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
          <InfiniteContentGrid
            items={list.items}
            isRefreshing={list.isRefreshing}
            columns={6}
            showTypeBadge={false}
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
    </div>
  );
}
