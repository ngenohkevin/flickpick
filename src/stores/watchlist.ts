// ==========================================================================
// Watchlist Store
// Manages user's watchlist with localStorage persistence
// ==========================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
      },

      removeItem: (id, mediaType) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.media_type === mediaType)
          ),
        }));
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
        return items[randomIndex] ?? null;
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
