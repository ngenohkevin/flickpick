import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePreferences, getEffectiveTheme, type Theme } from '@/stores/preferences';

describe('usePreferences store', () => {
  beforeEach(() => {
    // Reset to defaults
    const { result } = renderHook(() => usePreferences());
    act(() => {
      result.current.setTheme('dark');
      result.current.setCountry('US');
    });
  });

  describe('initial state', () => {
    it('has dark theme by default', () => {
      const { result } = renderHook(() => usePreferences());
      expect(result.current.theme).toBe('dark');
    });

    it('has US country by default', () => {
      const { result } = renderHook(() => usePreferences());
      expect(result.current.country).toBe('US');
    });
  });

  describe('setTheme', () => {
    it('sets theme to light', () => {
      const { result } = renderHook(() => usePreferences());

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('sets theme to system', () => {
      const { result } = renderHook(() => usePreferences());

      act(() => {
        result.current.setTheme('system');
      });

      expect(result.current.theme).toBe('system');
    });

    it('sets theme back to dark', () => {
      const { result } = renderHook(() => usePreferences());

      act(() => {
        result.current.setTheme('light');
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
    });
  });

  describe('setCountry', () => {
    it('sets country to GB', () => {
      const { result } = renderHook(() => usePreferences());

      act(() => {
        result.current.setCountry('GB');
      });

      expect(result.current.country).toBe('GB');
    });

    it('sets country to JP', () => {
      const { result } = renderHook(() => usePreferences());

      act(() => {
        result.current.setCountry('JP');
      });

      expect(result.current.country).toBe('JP');
    });
  });
});

describe('getEffectiveTheme', () => {
  describe('non-system themes', () => {
    it('returns dark for dark theme', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
    });

    it('returns light for light theme', () => {
      expect(getEffectiveTheme('light')).toBe('light');
    });
  });

  describe('system theme', () => {
    it('returns dark when system prefers dark', () => {
      // Mock matchMedia to return dark preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getEffectiveTheme('system')).toBe('dark');
    });

    it('returns light when system prefers light', () => {
      // Mock matchMedia to return light preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-color-scheme: light)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      expect(getEffectiveTheme('system')).toBe('light');
    });
  });
});
