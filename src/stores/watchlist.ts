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

export type ImportMode = 'replace' | 'merge_skip' | 'merge_update';

export interface WatchlistExport {
  version: 1;
  exported_at: string;
  app: 'flickpick';
  items: WatchlistItem[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
}

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

  // Import/Export
  exportWatchlist: () => WatchlistExport;
  importWatchlist: (data: WatchlistExport, mode: ImportMode) => ImportResult;
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

      exportWatchlist: () => {
        const { items } = get();
        return {
          version: 1 as const,
          exported_at: new Date().toISOString(),
          app: 'flickpick' as const,
          items,
        };
      },

      importWatchlist: (data: WatchlistExport, mode: ImportMode): ImportResult => {
        const result: ImportResult = {
          success: true,
          imported: 0,
          skipped: 0,
          updated: 0,
          errors: [],
        };

        // Validate basic structure
        if (!data || !Array.isArray(data.items)) {
          result.success = false;
          result.errors.push('Invalid data format');
          return result;
        }

        const currentItems = get().items;

        if (mode === 'replace') {
          // Replace all items
          const validItems: WatchlistItem[] = [];
          for (const item of data.items) {
            const validation = validateWatchlistItem(item);
            if (validation.valid) {
              validItems.push(item);
              result.imported++;
            } else {
              result.errors.push(`Skipped invalid item: ${validation.error}`);
              result.skipped++;
            }
          }
          set({ items: validItems });
        } else {
          // Merge modes
          const newItems = [...currentItems];

          for (const item of data.items) {
            const validation = validateWatchlistItem(item);
            if (!validation.valid) {
              result.errors.push(`Skipped invalid item: ${validation.error}`);
              result.skipped++;
              continue;
            }

            const existingIndex = newItems.findIndex(
              (existing) => existing.id === item.id && existing.media_type === item.media_type
            );

            if (existingIndex === -1) {
              // Item doesn't exist, add it
              newItems.push(item);
              result.imported++;
            } else if (mode === 'merge_update') {
              // Update existing item
              newItems[existingIndex] = item;
              result.updated++;
            } else {
              // merge_skip - skip duplicate
              result.skipped++;
            }
          }

          set({ items: newItems });
        }

        return result;
      },
    }),
    {
      name: 'flickpick-watchlist',
    }
  )
);

// ==========================================================================
// Validation
// ==========================================================================

const VALID_MEDIA_TYPES = ['movie', 'tv'] as const;
const VALID_CONTENT_TYPES = ['movie', 'tv', 'animation', 'anime'] as const;

function validateWatchlistItem(item: unknown): { valid: boolean; error?: string } {
  if (!item || typeof item !== 'object') {
    return { valid: false, error: 'Item is not an object' };
  }

  const obj = item as Record<string, unknown>;

  if (typeof obj.id !== 'number' || obj.id <= 0) {
    return { valid: false, error: 'Invalid id' };
  }

  if (typeof obj.title !== 'string' || obj.title.trim() === '') {
    return { valid: false, error: 'Invalid title' };
  }

  if (!VALID_MEDIA_TYPES.includes(obj.media_type as typeof VALID_MEDIA_TYPES[number])) {
    return { valid: false, error: 'Invalid media_type' };
  }

  if (!VALID_CONTENT_TYPES.includes(obj.content_type as typeof VALID_CONTENT_TYPES[number])) {
    return { valid: false, error: 'Invalid content_type' };
  }

  if (obj.poster_path !== null && typeof obj.poster_path !== 'string') {
    return { valid: false, error: 'Invalid poster_path' };
  }

  if (typeof obj.added_at !== 'string') {
    return { valid: false, error: 'Invalid added_at' };
  }

  // Validate ISO date format
  const date = new Date(obj.added_at);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid added_at date format' };
  }

  return { valid: true };
}

export function validateWatchlistExport(data: unknown): {
  valid: boolean;
  error?: string;
  data?: WatchlistExport;
} {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid file format' };
  }

  const obj = data as Record<string, unknown>;

  if (obj.app !== 'flickpick') {
    return { valid: false, error: 'Not a FlickPick export file' };
  }

  if (obj.version !== 1) {
    return { valid: false, error: 'Unsupported export version' };
  }

  if (!Array.isArray(obj.items)) {
    return { valid: false, error: 'Invalid items array' };
  }

  return { valid: true, data: data as WatchlistExport };
}

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
