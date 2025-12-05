// ==========================================================================
// Watchlist Store
// Manages user's watchlist with localStorage persistence
// ==========================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { trackWatchlistAdd, trackWatchlistRemove, trackWatchlistPickRandom } from '@/lib/analytics';
import type { WatchlistItem, MediaType, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface WatchlistState {
  items: WatchlistItem[];

  // Actions
  addItem: (item: Omit<WatchlistItem, 'added_at'>) => void;
  removeItem: (id: number, mediaType: MediaType) => void;
  toggleItem: (item: Omit<WatchlistItem, 'added_at'>) => void;
  isInWatchlist: (id: number, mediaType: MediaType) => boolean;
  clearWatchlist: () => void;
  getFilteredItems: (filter: ContentType | 'all') => WatchlistItem[];
  getRandomItem: (filter?: ContentType | 'all') => WatchlistItem | null;
}

// ==========================================================================
// Store
// ==========================================================================

export const useWatchlist = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const newItem: WatchlistItem = {
          ...item,
          added_at: new Date().toISOString(),
        };
        set((state) => ({
          items: [newItem, ...state.items],
        }));
        // Track watchlist add
        trackWatchlistAdd(item.id, item.media_type, item.title);
      },

      removeItem: (id, mediaType) => {
        // Get the item title before removing for tracking
        const itemToRemove = get().items.find(
          (item) => item.id === id && item.media_type === mediaType
        );
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.media_type === mediaType)
          ),
        }));
        // Track watchlist remove
        if (itemToRemove) {
          trackWatchlistRemove(id, mediaType, itemToRemove.title);
        }
      },

      toggleItem: (item) => {
        const { isInWatchlist, addItem, removeItem } = get();
        if (isInWatchlist(item.id, item.media_type)) {
          removeItem(item.id, item.media_type);
        } else {
          addItem(item);
        }
      },

      isInWatchlist: (id, mediaType) => {
        return get().items.some(
          (item) => item.id === id && item.media_type === mediaType
        );
      },

      clearWatchlist: () => {
        set({ items: [] });
      },

      getFilteredItems: (filter) => {
        const { items } = get();
        if (filter === 'all') return items;
        return items.filter((item) => item.content_type === filter);
      },

      getRandomItem: (filter = 'all') => {
        const items = get().getFilteredItems(filter);
        if (items.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * items.length);
        const pickedItem = items[randomIndex] ?? null;
        // Track random pick
        if (pickedItem) {
          trackWatchlistPickRandom(filter, pickedItem.id, pickedItem.title);
        }
        return pickedItem;
      },
    }),
    {
      name: 'flickpick-watchlist',
    }
  )
);

// ==========================================================================
// Selector Hooks (for performance optimization)
// ==========================================================================

export const useWatchlistCount = () => useWatchlist((state) => state.items.length);

export const useIsInWatchlist = (id: number, mediaType: MediaType) =>
  useWatchlist((state) =>
    state.items.some((item) => item.id === id && item.media_type === mediaType)
  );

// Returns the array of IDs - use with useMemo to create a Set if needed
export const useWatchlistItems = () => useWatchlist((state) => state.items);

// Hook that returns watchlist IDs as an array (stable reference with shallow comparison)
export const useWatchlistIdArray = () =>
  useWatchlist(useShallow((state) => state.items.map((item) => item.id)));
