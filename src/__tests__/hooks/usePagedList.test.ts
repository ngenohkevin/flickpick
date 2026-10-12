import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePagedList } from '@/lib/hooks/usePagedList';

type Item = { id: number };

function page(results: Item[], pageNum: number, totalPages: number) {
  return { results, page: pageNum, total_pages: totalPages, total_results: totalPages * 2 };
}

/** fetch mock whose responses are released by the test, in any order */
function deferredFetch() {
  const pending = new Map<string, (body: unknown, ok?: boolean) => void>();
  const fetchMock = vi.fn((url: string, init?: { signal?: AbortSignal }) => {
    return new Promise((resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      pending.set(url, (body, ok = true) =>
        resolve({ ok, status: ok ? 200 : 500, json: async () => body } as Response)
      );
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return {
    respond: async (url: string, body: unknown, ok = true) => {
      await act(async () => {
        pending.get(url)?.(body, ok);
      });
    },
    fetchMock,
  };
}

const getKey = (item: Item) => String(item.id);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePagedList', () => {
  it('ignores a slow response for a query the user has left', async () => {
    const { respond } = deferredFetch();
    const { result, rerender } = renderHook(({ q }) =>
      usePagedList<Item>({ buildUrl: (p) => `/api?q=${q}&page=${p}`, getKey }),
      { initialProps: { q: 'old' } }
    );

    rerender({ q: 'new' });
    await respond('/api?q=new&page=1', page([{ id: 2 }], 1, 1));
    await respond('/api?q=old&page=1', page([{ id: 1 }], 1, 1)); // arrives last

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toEqual([{ id: 2 }]);
  });

  it('keeps the previous results (refreshing) until the new query answers', async () => {
    const { respond } = deferredFetch();
    const { result, rerender } = renderHook(({ q }) =>
      usePagedList<Item>({ buildUrl: (p) => `/api?q=${q}&page=${p}`, getKey }),
      { initialProps: { q: 'a' } }
    );
    await respond('/api?q=a&page=1', page([{ id: 1 }, { id: 2 }], 1, 3));
    await waitFor(() => expect(result.current.items).toHaveLength(2));

    rerender({ q: 'b' });
    // No skeleton: the old list stays (dimmed by the page), with no "load more" on it
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRefreshing).toBe(true);
    expect(result.current.items.map((i) => i.id)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(false);

    await respond('/api?q=b&page=1', page([{ id: 9 }], 1, 1));
    await waitFor(() => expect(result.current.isRefreshing).toBe(false));
    expect(result.current.items).toEqual([{ id: 9 }]);
  });

  it('shows an error, not the previous results, when the new query fails', async () => {
    const { respond } = deferredFetch();
    const { result, rerender } = renderHook(({ q }) =>
      usePagedList<Item>({ buildUrl: (p) => `/api?q=${q}&page=${p}`, getKey }),
      { initialProps: { q: 'a' } }
    );
    await respond('/api?q=a&page=1', page([{ id: 1 }], 1, 1));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    rerender({ q: 'b' });
    await respond('/api?q=b&page=1', { error: 'boom' }, false);
    await waitFor(() => expect(result.current.error).toBe('initial'));
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  it('appends later pages without duplicates and stops at the last page', async () => {
    const { respond } = deferredFetch();
    const { result } = renderHook(() => usePagedList<Item>({ buildUrl: (p) => `/api?page=${p}`, getKey }));

    await respond('/api?page=1', page([{ id: 1 }, { id: 2 }], 1, 2));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => result.current.loadMore());
    await respond('/api?page=2', page([{ id: 2 }, { id: 3 }], 2, 2));

    await waitFor(() => expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]));
    expect(result.current.hasMore).toBe(false);
  });

  it('reports a first-page failure as an error, not an empty list, and retries', async () => {
    const { respond } = deferredFetch();
    const { result } = renderHook(() => usePagedList<Item>({ buildUrl: (p) => `/api?page=${p}`, getKey }));

    await respond('/api?page=1', { error: 'boom' }, false);
    await waitFor(() => expect(result.current.error).toBe('initial'));
    expect(result.current.isLoading).toBe(false);

    act(() => result.current.retry());
    expect(result.current.isLoading).toBe(true);
    await respond('/api?page=1', page([{ id: 1 }], 1, 1));
    await waitFor(() => expect(result.current.error).toBe(null));
    expect(result.current.items).toEqual([{ id: 1 }]);
  });

  it('a failed later page keeps the loaded items and does not re-request on its own', async () => {
    const { respond, fetchMock } = deferredFetch();
    const { result } = renderHook(() => usePagedList<Item>({ buildUrl: (p) => `/api?page=${p}`, getKey }));

    await respond('/api?page=1', page([{ id: 1 }], 1, 3));
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    act(() => result.current.loadMore());
    await respond('/api?page=2', { error: 'boom' }, false);
    await waitFor(() => expect(result.current.error).toBe('more'));
    expect(result.current.items).toEqual([{ id: 1 }]);

    const calls = fetchMock.mock.calls.length;
    act(() => result.current.loadMore()); // e.g. the scroll sentinel firing again
    act(() => result.current.loadMore());
    expect(fetchMock.mock.calls.length).toBe(calls + 1); // one guarded request, not a loop
  });

  it('restores several pages at once for scroll restoration', async () => {
    const { respond } = deferredFetch();
    const { result } = renderHook(() => usePagedList<Item>({ buildUrl: (p) => `/api?page=${p}`, getKey }));

    let restore: Promise<void> | undefined;
    act(() => {
      restore = result.current.restoreTo(3);
    });
    await respond('/api?page=1', page([{ id: 1 }], 1, 5));
    await respond('/api?page=2', page([{ id: 2 }], 2, 5));
    await respond('/api?page=3', page([{ id: 3 }], 3, 5));
    await act(async () => {
      await restore;
    });

    expect(result.current.items.map((i) => i.id)).toEqual([1, 2, 3]);
    expect(result.current.page).toBe(3);
    expect(result.current.hasMore).toBe(true);
  });
});
