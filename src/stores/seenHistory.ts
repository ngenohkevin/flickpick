// ==========================================================================
// Seen History Store
// Tracks content the user has watched with localStorage persistence
// ==========================================================================

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { MediaType, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

export interface SeenItem {
  id: number;
  media_type: MediaType;
  content_type: ContentType;
  title: string;
  poster_path: string | null;
  seen_at: string;
}

// For tracking individual episodes
export interface SeenEpisode {
  showId: number;
  seasonNumber: number;
  episodeNumber: number;
  seen_at: string;
}

interface SeenHistoryState {
  items: SeenItem[];
  episodes: SeenEpisode[];

  // Item Actions
  markAsSeen: (item: Omit<SeenItem, 'seen_at'>) => void;
  markAsUnseen: (id: number, mediaType: MediaType) => void;
  toggleSeen: (item: Omit<SeenItem, 'seen_at'>) => void;
  isSeen: (id: number, mediaType: MediaType) => boolean;
  clearSeenHistory: () => void;
  getFilteredItems: (filter: ContentType | 'all') => SeenItem[];

  // Episode Actions
  markEpisodeAsSeen: (showId: number, seasonNumber: number, episodeNumber: number) => void;
  markEpisodeAsUnseen: (showId: number, seasonNumber: number, episodeNumber: number) => void;
  isEpisodeSeen: (showId: number, seasonNumber: number, episodeNumber: number) => boolean;
  markSeasonAsSeen: (showId: number, seasonNumber: number, episodeCount: number) => void;
  markSeasonAsUnseen: (showId: number, seasonNumber: number) => void;
  getSeenEpisodesForSeason: (showId: number, seasonNumber: number) => number[];
  getSeasonProgress: (showId: number, seasonNumber: number, totalEpisodes: number) => {
    seen: number;
    total: number;
    percentage: number;
  };
}

// ==========================================================================
// Store
// ==========================================================================

export const useSeenHistory = create<SeenHistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      episodes: [],

      // ==========================================================================
      // Item Actions
      // ==========================================================================

      markAsSeen: (item) => {
        // Don't add if already seen
        if (get().isSeen(item.id, item.media_type)) return;

        const newItem: SeenItem = {
          ...item,
          seen_at: new Date().toISOString(),
        };
        set((state) => ({
          items: [newItem, ...state.items],
        }));
      },

      markAsUnseen: (id, mediaType) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.id === id && item.media_type === mediaType)
          ),
        }));
      },

      toggleSeen: (item) => {
        const { isSeen, markAsSeen, markAsUnseen } = get();
        if (isSeen(item.id, item.media_type)) {
          markAsUnseen(item.id, item.media_type);
        } else {
          markAsSeen(item);
        }
      },

      isSeen: (id, mediaType) => {
        return get().items.some(
          (item) => item.id === id && item.media_type === mediaType
        );
      },

      clearSeenHistory: () => {
        set({ items: [], episodes: [] });
      },

      getFilteredItems: (filter) => {
        const { items } = get();
        if (filter === 'all') return items;
        return items.filter((item) => item.content_type === filter);
      },

      // ==========================================================================
      // Episode Actions
      // ==========================================================================

      markEpisodeAsSeen: (showId, seasonNumber, episodeNumber) => {
        // Don't add if already seen
        if (get().isEpisodeSeen(showId, seasonNumber, episodeNumber)) return;

        const newEpisode: SeenEpisode = {
          showId,
          seasonNumber,
          episodeNumber,
          seen_at: new Date().toISOString(),
        };
        set((state) => ({
          episodes: [...state.episodes, newEpisode],
        }));
      },

      markEpisodeAsUnseen: (showId, seasonNumber, episodeNumber) => {
        set((state) => ({
          episodes: state.episodes.filter(
            (ep) =>
              !(
                ep.showId === showId &&
                ep.seasonNumber === seasonNumber &&
                ep.episodeNumber === episodeNumber
              )
          ),
        }));
      },

      isEpisodeSeen: (showId, seasonNumber, episodeNumber) => {
        return get().episodes.some(
          (ep) =>
            ep.showId === showId &&
            ep.seasonNumber === seasonNumber &&
            ep.episodeNumber === episodeNumber
        );
      },

      markSeasonAsSeen: (showId, seasonNumber, episodeCount) => {
        const { isEpisodeSeen } = get();
        const now = new Date().toISOString();
        const newEpisodes: SeenEpisode[] = [];

        for (let i = 1; i <= episodeCount; i++) {
          if (!isEpisodeSeen(showId, seasonNumber, i)) {
            newEpisodes.push({
              showId,
              seasonNumber,
              episodeNumber: i,
              seen_at: now,
            });
          }
        }

        if (newEpisodes.length > 0) {
          set((state) => ({
            episodes: [...state.episodes, ...newEpisodes],
          }));
        }
      },

      markSeasonAsUnseen: (showId, seasonNumber) => {
        set((state) => ({
          episodes: state.episodes.filter(
            (ep) => !(ep.showId === showId && ep.seasonNumber === seasonNumber)
          ),
        }));
      },

      getSeenEpisodesForSeason: (showId, seasonNumber) => {
        return get()
          .episodes.filter(
            (ep) => ep.showId === showId && ep.seasonNumber === seasonNumber
          )
          .map((ep) => ep.episodeNumber);
      },

      getSeasonProgress: (showId, seasonNumber, totalEpisodes) => {
        const seenEpisodes = get().getSeenEpisodesForSeason(showId, seasonNumber);
        const seen = seenEpisodes.length;
        const percentage = totalEpisodes > 0 ? Math.round((seen / totalEpisodes) * 100) : 0;
        return { seen, total: totalEpisodes, percentage };
      },
    }),
    {
      name: 'flickpick-seen-history',
    }
  )
);

// ==========================================================================
// Selector Hooks (for performance optimization)
// ==========================================================================

export const useSeenCount = () => useSeenHistory((state) => state.items.length);

export const useIsSeen = (id: number, mediaType: MediaType) =>
  useSeenHistory((state) =>
    state.items.some((item) => item.id === id && item.media_type === mediaType)
  );

export const useSeenItems = () => useSeenHistory((state) => state.items);

export const useSeenIdArray = () =>
  useSeenHistory(useShallow((state) => state.items.map((item) => item.id)));

export const useIsEpisodeSeen = (
  showId: number,
  seasonNumber: number,
  episodeNumber: number
) =>
  useSeenHistory((state) =>
    state.episodes.some(
      (ep) =>
        ep.showId === showId &&
        ep.seasonNumber === seasonNumber &&
        ep.episodeNumber === episodeNumber
    )
  );

// SSR-safe hook that returns episode count after client hydration
// Avoids infinite loop from SSR/hydration mismatch with persist middleware
export function useSeenEpisodeCount(showId: number, seasonNumber: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Get count from store
    const getCount = () =>
      useSeenHistory.getState().episodes.filter(
        (ep) => ep.showId === showId && ep.seasonNumber === seasonNumber
      ).length;

    // Set initial value after mount
    setCount(getCount());

    // Subscribe to store changes
    const unsubscribe = useSeenHistory.subscribe(() => {
      setCount(getCount());
    });

    return unsubscribe;
  }, [showId, seasonNumber]);

  return count;
}

// Helper function to calculate progress (use in component with useMemo if needed)
export function calculateSeasonProgress(seen: number, total: number) {
  const percentage = total > 0 ? Math.round((seen / total) * 100) : 0;
  return { seen, total, percentage };
}
