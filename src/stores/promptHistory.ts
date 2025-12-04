// ==========================================================================
// Prompt History Store
// Manages search history with localStorage persistence
// ==========================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';

// ==========================================================================
// Types
// ==========================================================================

export interface PromptHistoryItem {
  prompt: string;
  timestamp: string;
  resultCount: number;
}

interface PromptHistoryState {
  history: PromptHistoryItem[];
  maxItems: number;
  _hasHydrated: boolean;

  // Actions
  addPrompt: (prompt: string, resultCount: number) => void;
  removePrompt: (prompt: string) => void;
  clearHistory: () => void;
  getRecentPrompts: (limit?: number) => PromptHistoryItem[];
  setHasHydrated: (state: boolean) => void;
}

// ==========================================================================
// Store
// ==========================================================================

export const usePromptHistory = create<PromptHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      maxItems: 10,
      _hasHydrated: false,

      addPrompt: (prompt: string, resultCount: number) => {
        const trimmedPrompt = prompt.trim();
        if (trimmedPrompt.length < 3) return;

        set((state) => {
          // Remove existing entry with same prompt (case-insensitive)
          const filtered = state.history.filter(
            (item) => item.prompt.toLowerCase() !== trimmedPrompt.toLowerCase()
          );

          // Add new entry at the beginning
          const newHistory = [
            {
              prompt: trimmedPrompt,
              timestamp: new Date().toISOString(),
              resultCount,
            },
            ...filtered,
          ].slice(0, state.maxItems);

          return { history: newHistory };
        });
      },

      removePrompt: (prompt: string) => {
        set((state) => ({
          history: state.history.filter(
            (item) => item.prompt.toLowerCase() !== prompt.toLowerCase()
          ),
        }));
      },

      clearHistory: () => {
        set({ history: [] });
      },

      getRecentPrompts: (limit = 5) => {
        return get().history.slice(0, limit);
      },

      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'flickpick-prompt-history',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ==========================================================================
// Selector Hooks
// ==========================================================================

// Stable empty array reference to prevent infinite re-renders
const EMPTY_HISTORY: PromptHistoryItem[] = [];

// Check if store has hydrated from localStorage
export const useHasHydrated = () =>
  usePromptHistory((state) => state._hasHydrated);

// Get the full history array with shallow comparison to prevent infinite loops
// Returns empty array during SSR/before hydration to prevent mismatch
export const usePromptHistoryItems = () => {
  const hasHydrated = useHasHydrated();
  const history = usePromptHistory(useShallow((state) => state.history));

  // Return stable empty array during SSR/before hydration to prevent hydration mismatch
  if (!hasHydrated) {
    return EMPTY_HISTORY;
  }

  return history;
};

// Get recent prompts with a limit
// Uses useMemo to prevent creating new array references on each render
export const useRecentPrompts = (limit = 5) => {
  const history = usePromptHistoryItems();

  return useMemo(() => {
    // Return stable empty array if history is empty
    if (history.length === 0) {
      return EMPTY_HISTORY;
    }
    return history.slice(0, limit);
  }, [history, limit]);
};

// Check if there's any history (after hydration)
export const useHasHistory = () => {
  const hasHydrated = useHasHydrated();
  const historyLength = usePromptHistory((state) => state.history.length);

  // Return false during SSR/before hydration
  if (!hasHydrated) {
    return false;
  }

  return historyLength > 0;
};
