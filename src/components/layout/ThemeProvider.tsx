'use client';

// ==========================================================================
// Theme Provider
// Handles theme application and system preference detection
// ==========================================================================

import { useEffect } from 'react';
import { usePreferences, getEffectiveTheme } from '@/stores/preferences';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = usePreferences();

  useEffect(() => {
    const root = document.documentElement;
    const effectiveTheme = getEffectiveTheme(theme);

    // Apply theme attribute for CSS variables
    root.setAttribute('data-theme', effectiveTheme);

    // Also add class for Tailwind dark mode if needed
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes when theme is set to 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      const root = document.documentElement;
      const effectiveTheme = mediaQuery.matches ? 'dark' : 'light';
      root.setAttribute('data-theme', effectiveTheme);

      if (effectiveTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  return <>{children}</>;
}
