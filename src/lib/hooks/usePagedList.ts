// ==========================================================================
// usePagedList Hook
// Fetches a paginated list (page 1, then "load more"), resetting whenever the
// query changes. Each query gets a generation number and an AbortController,
// so a slow response for an old query can never overwrite a newer one.
// ==========================================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface PagedResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

type Status = 'loading' | 'ready' | 'loading-more' | 'error' | 'error-more';

interface ListState<T, R> {
  /** The query this state belongs to (the page-1 URL) */
  key: string;
  items: T[];
  page: number;
  totalPages: number;
  totalResults: number;
  status: Status;
  /** First page's response, for extra fields such as a date range */
  firstPage: R | null;
}

interface UsePagedListOptions<T> {
  /** Request URL for a page. The list resets when the URL for page 1 changes. */
  buildUrl: (page: number) => string;
  /** Identity of an item across pages; later duplicates are dropped. */
  getKey: (item: T) => string;
}

/** Most pages a scroll restore will refetch (20-40 items each). */
const MAX_RESTORE_PAGES = 15;

async function fetchPage<R>(url: string, signal: AbortSignal): Promise<R> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as R;
}

function appendUnique<T>(prev: T[], next: T[], getKey: (item: T) => string): T[] {
  const seen = new Set(prev.map(getKey));
  const added = next.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return added.length > 0 ? [...prev, ...added] : prev;
}

export function usePagedList<T, R extends PagedResponse<T> = PagedResponse<T>>(
  options: UsePagedListOptions<T>
) {
  const queryKey = options.buildUrl(1);
  const [state, setState] = useState<ListState<T, R> | null>(null);

  // Latest options for handlers and effects; never read during render
  const optionsRef = useRef(options);
  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const loadMoreInFlightRef = useRef(false);

  /** Cancels everything in flight and starts a new generation. */
  const startGeneration = useCallback(() => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    loadMoreInFlightRef.current = false;
    generationRef.current += 1;
    return { generation: generationRef.current, signal: controller.signal };
  }, []);

  const loadFirstPage = useCallback(
    (key: string) => {
      const { generation, signal } = startGeneration();
      const { getKey } = optionsRef.current;

      fetchPage<R>(key, signal)
        .then((data) => {
          if (generation !== generationRef.current) return;
          setState({
            key,
            items: appendUnique([], data.results ?? [], getKey),
            page: data.page,
            totalPages: data.total_pages,
            totalResults: data.total_results,
            status: 'ready',
            firstPage: data,
          });
        })
        .catch((error: unknown) => {
          if (generation !== generationRef.current || signal.aborted) return;
          console.error('Error fetching list:', error);
          setState({
            key,
            items: [],
            page: 0,
            totalPages: 0,
            totalResults: 0,
            status: 'error',
            firstPage: null,
          });
        });
    },
    [startGeneration]
  );

  // New query: drop the old list and fetch page 1
  useEffect(() => {
    loadFirstPage(queryKey);
    return () => controllerRef.current?.abort();
  }, [queryKey, loadFirstPage]);

  // State left over from a previous query is never shown
  const current = state?.key === queryKey ? state : null;

  const loadMore = useCallback(() => {
    if (!current || loadMoreInFlightRef.current) return;
    if (current.status !== 'ready' && current.status !== 'error-more') return;
    if (current.page >= current.totalPages) return;

    const generation = generationRef.current;
    const signal = controllerRef.current?.signal;
    if (!signal) return;
    const { key } = current;
    const { buildUrl, getKey } = optionsRef.current;

    loadMoreInFlightRef.current = true;
    setState((s) => (s && s.key === key ? { ...s, status: 'loading-more' } : s));

    fetchPage<R>(buildUrl(current.page + 1), signal)
      .then((data) => {
        if (generation !== generationRef.current) return;
        setState((s) =>
          s && s.key === key
            ? {
                ...s,
                items: appendUnique(s.items, data.results ?? [], getKey),
                page: data.page,
                totalPages: data.total_pages,
                totalResults: data.total_results,
                status: 'ready',
              }
            : s
        );
      })
      .catch((error: unknown) => {
        if (generation !== generationRef.current || signal.aborted) return;
        console.error('Error loading more:', error);
        setState((s) => (s && s.key === key ? { ...s, status: 'error-more' } : s));
      })
      .finally(() => {
        if (generation === generationRef.current) loadMoreInFlightRef.current = false;
      });
  }, [current]);

  const retry = useCallback(() => {
    if (!current) return;
    if (current.status === 'error') {
      setState({ ...current, status: 'loading' });
      loadFirstPage(current.key);
    } else if (current.status === 'error-more') {
      loadMore();
    }
  }, [current, loadFirstPage, loadMore]);

  /**
   * Refetches pages 1..targetPage in one go (scroll restoration after Back).
   * Stable identity: safe to pass straight to useScrollRestoration.
   */
  const restoreTo = useCallback(
    async (targetPage: number) => {
      const target = Math.min(targetPage, MAX_RESTORE_PAGES);
      if (target <= 1) return;

      const { buildUrl, getKey } = optionsRef.current;
      const key = buildUrl(1);
      const { generation, signal } = startGeneration();

      const settled = await Promise.allSettled(
        Array.from({ length: target }, (_, i) => fetchPage<R>(buildUrl(i + 1), signal))
      );
      if (generation !== generationRef.current) return;

      // Keep pages up to the first failure, so the list has no holes
      const pages: R[] = [];
      for (const result of settled) {
        if (result.status !== 'fulfilled') break;
        pages.push(result.value);
      }
      const last = pages[pages.length - 1];
      if (!last) {
        loadFirstPage(key);
        return;
      }

      setState({
        key,
        items: pages.reduce<T[]>((acc, p) => appendUnique(acc, p.results ?? [], getKey), []),
        page: last.page,
        totalPages: last.total_pages,
        totalResults: last.total_results,
        status: 'ready',
        firstPage: pages[0] ?? null,
      });
    },
    [startGeneration, loadFirstPage]
  );

  return {
    items: current?.items ?? [],
    page: current?.page ?? 1,
    totalPages: current?.totalPages ?? 0,
    totalResults: current?.totalResults ?? 0,
    firstPage: current?.firstPage ?? null,
    isLoading: !current || current.status === 'loading',
    isLoadingMore: current?.status === 'loading-more',
    /** 'initial': page 1 failed (nothing to show); 'more': a later page failed */
    error: current?.status === 'error' ? 'initial' : current?.status === 'error-more' ? 'more' : null,
    hasMore: !!current && current.page < current.totalPages,
    loadMore,
    retry,
    restoreTo,
  } as const;
}
