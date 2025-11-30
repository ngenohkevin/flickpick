'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { InfiniteContentGrid } from '@/components/content';
import { SortDropdown, type SortOption } from '@/components/browse';
import { useWatchlist } from '@/stores/watchlist';
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

export function GenrePageContent({
  genreId,
  genreName,
  type,
  typeLabel,
  description,
}: GenrePageContentProps) {
  const [sortBy, setSortBy] = useState<SortOption>('popularity');
  const [items, setItems] = useState<Content[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Watchlist
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => item.id));

  // Get other genres for quick navigation
  const genreList = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const otherGenres = Object.entries(genreList)
    .filter(([id]) => parseInt(id, 10) !== genreId)
    .slice(0, 8);

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
          sort_by: sortBy,
        });

        const response = await fetch(`/api/genre/${type}/${genreId}?${params}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data: GenreResponse = await response.json();

        if (append) {
          setItems((prev) => [...prev, ...data.results]);
        } else {
          setItems(data.results);
        }
        setPage(data.page);
        setTotalPages(data.total_pages);
        setTotalResults(data.total_results);
      } catch (error) {
        console.error('Error fetching genre content:', error);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [genreId, type, sortBy]
  );

  // Initial fetch and refetch on sort change
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
    const releaseDate = 'release_date' in content ? content.release_date : content.first_air_date;

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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">
                {genreName} {typeLabel}
              </h1>
              <p className="mt-2 max-w-2xl text-text-secondary">{description}</p>
              {!isLoading && (
                <p className="mt-2 text-sm text-text-tertiary">
                  {totalResults.toLocaleString()} titles
                </p>
              )}
            </div>
            <SortDropdown value={sortBy} onChange={setSortBy} />
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

      {/* Content Grid */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InfiniteContentGrid
          items={items}
          columns={6}
          showTypeBadge={false}
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
