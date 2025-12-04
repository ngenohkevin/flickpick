// ==========================================================================
// Filter Preferences Store
// Persists user's filter preferences to localStorage
// ==========================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FilterState, RuntimeFilter } from '@/components/browse/FilterSidebar';

// ==========================================================================
// Types
// ==========================================================================

/**
 * User's preferred default filters
 * These are applied as defaults when visiting browse pages
 */
export interface FilterPreferences {
  /** Preferred streaming providers (IDs) */
  preferredProviders: string[];

  /** Preferred language */
  preferredLanguage: string | null;

  /** Preferred runtime filter */
  preferredRuntime: RuntimeFilter;

  /** Minimum rating preference */
  preferredMinRating: number | null;

  /** Whether to auto-apply preferences on browse pages */
  autoApplyPreferences: boolean;

  /** Last used watch region */
  watchRegion: string;
}

interface FilterPreferencesState extends FilterPreferences {
  // Actions
  setPreferredProviders: (providers: string[]) => void;
  setPreferredLanguage: (language: string | null) => void;
  setPreferredRuntime: (runtime: RuntimeFilter) => void;
  setPreferredMinRating: (rating: number | null) => void;
  setAutoApplyPreferences: (autoApply: boolean) => void;
  setWatchRegion: (region: string) => void;
  resetPreferences: () => void;

  /** Get filter state with preferences applied */
  getDefaultFilters: () => Partial<FilterState>;

  /** Save current filters as preferences */
  saveAsPreferences: (filters: FilterState) => void;
}

// ==========================================================================
// Default Values
// ==========================================================================

const defaultPreferences: FilterPreferences = {
  preferredProviders: [],
  preferredLanguage: null,
  preferredRuntime: null,
  preferredMinRating: null,
  autoApplyPreferences: false,
  watchRegion: 'US',
};

// ==========================================================================
// Store
// ==========================================================================

export const useFilterPreferences = create<FilterPreferencesState>()(
  persist(
    (set, get) => ({
      ...defaultPreferences,

      setPreferredProviders: (providers) =>
        set({ preferredProviders: providers }),

      setPreferredLanguage: (language) =>
        set({ preferredLanguage: language }),

      setPreferredRuntime: (runtime) =>
        set({ preferredRuntime: runtime }),

      setPreferredMinRating: (rating) =>
        set({ preferredMinRating: rating }),

      setAutoApplyPreferences: (autoApply) =>
        set({ autoApplyPreferences: autoApply }),

      setWatchRegion: (region) =>
        set({ watchRegion: region }),

      resetPreferences: () =>
        set(defaultPreferences),

      getDefaultFilters: () => {
        const state = get();
        if (!state.autoApplyPreferences) {
          return {};
        }

        return {
          provider: state.preferredProviders[0] ?? null,
          language: state.preferredLanguage,
          runtime: state.preferredRuntime,
          ratingMin: state.preferredMinRating,
        };
      },

      saveAsPreferences: (filters) => {
        set({
          preferredProviders: filters.provider ? [filters.provider] : [],
          preferredLanguage: filters.language,
          preferredRuntime: filters.runtime,
          preferredMinRating: filters.ratingMin,
          autoApplyPreferences: true,
        });
      },
    }),
    {
      name: 'flickpick-filter-preferences',
      partialize: (state) => ({
        preferredProviders: state.preferredProviders,
        preferredLanguage: state.preferredLanguage,
        preferredRuntime: state.preferredRuntime,
        preferredMinRating: state.preferredMinRating,
        autoApplyPreferences: state.autoApplyPreferences,
        watchRegion: state.watchRegion,
      }),
    }
  )
);

// ==========================================================================
// Hook for applying preferences
// ==========================================================================

/**
 * Hook to get the watch region preference
 */
export function useWatchRegion() {
  return useFilterPreferences((state) => state.watchRegion);
}

/**
 * Hook to check if preferences should be auto-applied
 */
export function useAutoApplyPreferences() {
  return useFilterPreferences((state) => state.autoApplyPreferences);
}
