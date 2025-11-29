// ==========================================================================
// useLocalStorage Hook
// Persists state to localStorage with SSR safety
// ==========================================================================

import { useState, useCallback, useSyncExternalStore, useMemo } from 'react';

/**
 * Get stored value from localStorage
 */
function getStoredValue<T>(key: string, initialValue: T): T {
  if (typeof window === 'undefined') {
    return initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return initialValue;
  }
}

/**
 * Persist state to localStorage with SSR safety
 * Uses useSyncExternalStore for proper SSR hydration
 * @param key - The localStorage key
 * @param initialValue - The initial value if no stored value exists
 * @returns [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Force re-render mechanism
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Memoize the initial value to avoid recreating on each render
  const memoizedInitialValue = useMemo(() => initialValue, [initialValue]);

  // Get snapshot for useSyncExternalStore
  const getSnapshot = useCallback(() => {
    return getStoredValue(key, memoizedInitialValue);
  }, [key, memoizedInitialValue]);

  // Server snapshot always returns initial value
  const getServerSnapshot = useCallback(() => {
    return memoizedInitialValue;
  }, [memoizedInitialValue]);

  // Subscribe to storage events from other tabs/windows
  const subscribe = useCallback(
    (callback: () => void) => {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key) {
          callback();
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    },
    [key]
  );

  // Use useSyncExternalStore for SSR-safe hydration
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Get current value
        const currentValue = getStoredValue(key, memoizedInitialValue);
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(currentValue) : value;
        // Save to localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          // Trigger re-render
          forceUpdate();
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, memoizedInitialValue, forceUpdate]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        // Trigger re-render
        forceUpdate();
      }
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, forceUpdate]);

  return [storedValue, setValue, removeValue];
}
