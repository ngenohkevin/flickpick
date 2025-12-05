import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  useWatchlist,
  useWatchlistCount,
  useIsInWatchlist,
  useWatchlistItems,
} from '@/stores/watchlist';
import type { WatchlistItem, MediaType, ContentType } from '@/types';

// Helper to create a mock watchlist item
function createMockItem(
  id: number,
  mediaType: MediaType = 'movie',
  contentType: ContentType = 'movie'
): Omit<WatchlistItem, 'added_at'> {
  return {
    id,
    title: `Test ${mediaType} ${id}`,
    media_type: mediaType,
    content_type: contentType,
    poster_path: `/poster${id}.jpg`,
  };
}

describe('useWatchlist store', () => {
  beforeEach(() => {
    // Clear the store before each test
    const { result } = renderHook(() => useWatchlist());
    act(() => {
      result.current.clearWatchlist();
    });
  });

  describe('addItem', () => {
    it('adds an item to the watchlist', () => {
      const { result } = renderHook(() => useWatchlist());
      const item = createMockItem(1);

      act(() => {
        result.current.addItem(item);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toMatchObject({
        ...item,
        added_at: expect.any(String),
      });
    });

    it('adds item to the beginning of the list', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
        result.current.addItem(createMockItem(2));
      });

      expect(result.current.items[0]?.id).toBe(2);
      expect(result.current.items[1]?.id).toBe(1);
    });

    it('includes added_at timestamp', () => {
      const { result } = renderHook(() => useWatchlist());
      const before = new Date().toISOString();

      act(() => {
        result.current.addItem(createMockItem(1));
      });

      const after = new Date().toISOString();
      const addedAt = result.current.items[0]?.added_at;

      expect(addedAt).toBeDefined();
      expect(new Date(addedAt!).getTime()).toBeGreaterThanOrEqual(
        new Date(before).getTime()
      );
      expect(new Date(addedAt!).getTime()).toBeLessThanOrEqual(
        new Date(after).getTime()
      );
    });
  });

  describe('removeItem', () => {
    it('removes an item from the watchlist', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
        result.current.addItem(createMockItem(2));
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem(1, 'movie');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.id).toBe(2);
    });

    it('only removes matching media_type', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1, 'movie'));
        result.current.addItem(createMockItem(1, 'tv'));
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem(1, 'movie');
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]?.media_type).toBe('tv');
    });

    it('does nothing when item not found', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
      });

      act(() => {
        result.current.removeItem(999, 'movie');
      });

      expect(result.current.items).toHaveLength(1);
    });
  });

  describe('toggleItem', () => {
    it('adds item if not in watchlist', () => {
      const { result } = renderHook(() => useWatchlist());
      const item = createMockItem(1);

      act(() => {
        result.current.toggleItem(item);
      });

      expect(result.current.items).toHaveLength(1);
    });

    it('removes item if already in watchlist', () => {
      const { result } = renderHook(() => useWatchlist());
      const item = createMockItem(1);

      act(() => {
        result.current.addItem(item);
      });

      expect(result.current.items).toHaveLength(1);

      act(() => {
        result.current.toggleItem(item);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('isInWatchlist', () => {
    it('returns true when item is in watchlist', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
      });

      expect(result.current.isInWatchlist(1, 'movie')).toBe(true);
    });

    it('returns false when item is not in watchlist', () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.isInWatchlist(1, 'movie')).toBe(false);
    });

    it('returns false for different media_type', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1, 'movie'));
      });

      expect(result.current.isInWatchlist(1, 'tv')).toBe(false);
    });
  });

  describe('clearWatchlist', () => {
    it('removes all items from watchlist', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
        result.current.addItem(createMockItem(2));
        result.current.addItem(createMockItem(3));
      });

      expect(result.current.items).toHaveLength(3);

      act(() => {
        result.current.clearWatchlist();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe('getFilteredItems', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useWatchlist());
      act(() => {
        result.current.addItem(createMockItem(1, 'movie', 'movie'));
        result.current.addItem(createMockItem(2, 'tv', 'tv'));
        result.current.addItem(createMockItem(3, 'movie', 'animation'));
        result.current.addItem(createMockItem(4, 'tv', 'anime'));
      });
    });

    it('returns all items for "all" filter', () => {
      const { result } = renderHook(() => useWatchlist());
      expect(result.current.getFilteredItems('all')).toHaveLength(4);
    });

    it('filters by content_type "movie"', () => {
      const { result } = renderHook(() => useWatchlist());
      const filtered = result.current.getFilteredItems('movie');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.content_type).toBe('movie');
    });

    it('filters by content_type "tv"', () => {
      const { result } = renderHook(() => useWatchlist());
      const filtered = result.current.getFilteredItems('tv');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.content_type).toBe('tv');
    });

    it('filters by content_type "animation"', () => {
      const { result } = renderHook(() => useWatchlist());
      const filtered = result.current.getFilteredItems('animation');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.content_type).toBe('animation');
    });

    it('filters by content_type "anime"', () => {
      const { result } = renderHook(() => useWatchlist());
      const filtered = result.current.getFilteredItems('anime');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.content_type).toBe('anime');
    });
  });

  describe('getRandomItem', () => {
    it('returns null for empty watchlist', () => {
      const { result } = renderHook(() => useWatchlist());
      expect(result.current.getRandomItem()).toBeNull();
    });

    it('returns an item from the watchlist', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1));
        result.current.addItem(createMockItem(2));
        result.current.addItem(createMockItem(3));
      });

      const randomItem = result.current.getRandomItem();
      expect(randomItem).toBeDefined();
      expect([1, 2, 3]).toContain(randomItem?.id);
    });

    it('respects filter parameter', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1, 'movie', 'movie'));
        result.current.addItem(createMockItem(2, 'tv', 'tv'));
      });

      const randomItem = result.current.getRandomItem('movie');
      expect(randomItem?.id).toBe(1);
    });

    it('returns null when filter matches no items', () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addItem(createMockItem(1, 'movie', 'movie'));
      });

      expect(result.current.getRandomItem('anime')).toBeNull();
    });
  });
});

describe('Watchlist selector hooks', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useWatchlist());
    act(() => {
      result.current.clearWatchlist();
    });
  });

  describe('useWatchlistCount', () => {
    it('returns the count of items', () => {
      const { result: countResult } = renderHook(() => useWatchlistCount());
      const { result: storeResult } = renderHook(() => useWatchlist());

      expect(countResult.current).toBe(0);

      act(() => {
        storeResult.current.addItem(createMockItem(1));
        storeResult.current.addItem(createMockItem(2));
      });

      const { result: updatedCount } = renderHook(() => useWatchlistCount());
      expect(updatedCount.current).toBe(2);
    });
  });

  describe('useIsInWatchlist', () => {
    it('returns true when item is in watchlist', () => {
      const { result: storeResult } = renderHook(() => useWatchlist());

      act(() => {
        storeResult.current.addItem(createMockItem(42));
      });

      const { result: isInResult } = renderHook(() =>
        useIsInWatchlist(42, 'movie')
      );
      expect(isInResult.current).toBe(true);
    });

    it('returns false when item is not in watchlist', () => {
      const { result: isInResult } = renderHook(() =>
        useIsInWatchlist(999, 'movie')
      );
      expect(isInResult.current).toBe(false);
    });
  });

  describe('useWatchlistItems', () => {
    it('returns all items', () => {
      const { result: storeResult } = renderHook(() => useWatchlist());

      act(() => {
        storeResult.current.addItem(createMockItem(1));
        storeResult.current.addItem(createMockItem(2));
      });

      const { result: itemsResult } = renderHook(() => useWatchlistItems());
      expect(itemsResult.current).toHaveLength(2);
    });
  });
});
