// ==========================================================================
// Preferences Store
// Manages user preferences including theme, country, etc.
// ==========================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ==========================================================================
// Types
// ==========================================================================

export type Theme = 'dark' | 'light' | 'system';

interface PreferencesState {
  theme: Theme;
  country: string;
  setTheme: (theme: Theme) => void;
  setCountry: (country: string) => void;
}

// ==========================================================================
// Store
// ==========================================================================

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'dark', // Default to dark mode
      country: 'US', // Default country for streaming availability

      setTheme: (theme) => set({ theme }),
      setCountry: (country) => set({ country }),
    }),
    {
      name: 'flickpick-preferences',
    }
  )
);

// ==========================================================================
// Helper Functions
// ==========================================================================

/**
 * Get the effective theme based on user preference and system setting
 */
export function getEffectiveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    }
    return 'dark'; // Default to dark on server
  }
  return theme;
}
