'use client';

import { ContentGrid } from '@/components/content';
import { useWatchlist, watchlistKey } from '@/stores/watchlist';
import { getContentType } from '@/lib/utils';
import type { Content, WatchlistItem } from '@/types';

/** Search results with working watchlist hearts. */
export function SearchResultsGrid({ items }: { items: Content[] }) {
  const watchlist = useWatchlist();
  const watchlistIds = new Set(watchlist.items.map((item: WatchlistItem) => watchlistKey(item.media_type, item.id)));

  const handleWatchlistToggle = (content: Content) => {
    const isFilm = 'title' in content;
    watchlist.toggleItem({
      id: content.id,
      title: isFilm ? content.title : content.name,
      media_type: isFilm ? 'movie' : 'tv',
      content_type: getContentType(content),
      poster_path: content.poster_path,
    });
  };

  return <ContentGrid items={items} watchlistIds={watchlistIds} onWatchlistToggle={handleWatchlistToggle} />;
}
