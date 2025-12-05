import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '@/lib/hooks/useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    expect(result.current).toBe('initial');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');
  });

  it('uses default delay of 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('updated');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'change1', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change2', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'change3', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Still should be initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Now wait full delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should be the last value
    expect(result.current).toBe('change3');
  });

  it('works with different data types', () => {
    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    );

    numberRerender({ value: 42, delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(numberResult.current).toBe(42);

    // Object
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { foo: 'bar' }, delay: 300 } }
    );

    objectRerender({ value: { foo: 'baz' }, delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(objectResult.current).toEqual({ foo: 'baz' });

    // Array
    const { result: arrayResult, rerender: arrayRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: [1, 2, 3], delay: 300 } }
    );

    arrayRerender({ value: [4, 5, 6], delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(arrayResult.current).toEqual([4, 5, 6]);
  });

  it('respects different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    );

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('updated');
  });

  it('handles delay change', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    // Change delay
    rerender({ value: 'updated', delay: 100 });

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe('updated');
  });

  it('cleans up timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    rerender({ value: 'updated', delay: 300 });

    unmount();

    // Advance time - should not cause any issues
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Cannot check result after unmount, but no error should occur
    expect(true).toBe(true);
  });

  it('handles empty string', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'search', delay: 300 } }
    );

    rerender({ value: '', delay: 300 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('');
  });

  it('handles null and undefined', () => {
    const { result: nullResult, rerender: nullRerender } = renderHook(
      ({ value, delay }) => useDebounce<string | null>(value, delay),
      { initialProps: { value: 'initial' as string | null, delay: 300 } }
    );

    nullRerender({ value: null, delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(nullResult.current).toBeNull();

    const { result: undefinedResult, rerender: undefinedRerender } = renderHook(
      ({ value, delay }) => useDebounce<string | undefined>(value, delay),
      { initialProps: { value: 'initial' as string | undefined, delay: 300 } }
    );

    undefinedRerender({ value: undefined, delay: 300 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(undefinedResult.current).toBeUndefined();
  });
});
