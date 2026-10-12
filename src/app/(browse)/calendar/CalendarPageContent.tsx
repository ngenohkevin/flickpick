'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { pushUrl } from '@/components/browse/filter-params';
import { Calendar, CalendarFilters, ReleaseModal, type CalendarTypeFilter } from '@/components/calendar';
import { useScrollRestoration } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { CalendarDay as CalendarDayType, CalendarRelease, CalendarResponse } from '@/types';

// ==========================================================================
// CalendarPageContent Component
// Client-side calendar page with data fetching and state management
// ==========================================================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const TYPE_FILTERS: CalendarTypeFilter[] = ['all', 'movie', 'tv'];

function isValidMonth(value: string | null): value is string {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  return !!match && Number(match[2]) >= 1 && Number(match[2]) <= 12;
}

export function CalendarPageContent() {
  const searchParams = useSearchParams();

  // Month and type come from the URL only. Mirroring them into state, with an
  // effect syncing state back from the URL, raced the URL update: each month
  // change flickered back to the old month and fetched three times.
  const monthParam = searchParams.get('month');
  const typeParam = searchParams.get('type') as CalendarTypeFilter | null;
  const month = isValidMonth(monthParam) ? monthParam : getCurrentMonth();
  const typeFilter: CalendarTypeFilter = typeParam && TYPE_FILTERS.includes(typeParam) ? typeParam : 'all';

  // Fetch state, tagged with the query it belongs to
  const queryKey = `${month}|${typeFilter}`;
  const [result, setResult] = useState<{
    key: string;
    month: string;
    releases: CalendarRelease[];
    error: string | null;
  } | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedDay, setSelectedDay] = useState<CalendarDayType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Scroll restoration
  useScrollRestoration();

  // Fetch calendar data when month or filter changes; a response for a month
  // the user has already left is aborted
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ month, type: typeFilter });

    fetch(`/api/calendar?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Failed to fetch calendar data');
        const data: CalendarResponse = await response.json();
        setResult({ key: queryKey, month, releases: data.releases, error: null });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          key: queryKey,
          month,
          releases: [],
          error: err instanceof Error ? err.message : 'An error occurred',
        });
      });

    return () => controller.abort();
  }, [month, typeFilter, queryKey, reloadCount]);

  const current = result?.key === queryKey ? result : null;
  const isLoading = !current;
  const error = current?.error ?? null;
  // Switching the type filter keeps this month's releases on screen (dimmed)
  // until the new list arrives; a new month shows its empty grid instead.
  // Either way the calendar stays in place, so nothing jumps.
  const previous = !current && result && !result.error && result.month === month ? result : null;
  const releases = (current ?? previous)?.releases ?? [];

  const retry = () => {
    setResult(null);
    setReloadCount((n) => n + 1);
  };

  // Update URL with current state (the fetch follows the URL)
  const updateUrl = (newMonth: string, newType: CalendarTypeFilter) => {
    const params = new URLSearchParams();
    // Always include month if not current month
    if (newMonth !== getCurrentMonth()) {
      params.set('month', newMonth);
    }
    // Include type filter if not 'all'
    if (newType !== 'all') {
      params.set('type', newType);
    }
    pushUrl('/calendar', params);
  };

  // Event handlers
  const handleMonthChange = (newMonth: string) => updateUrl(newMonth, typeFilter);
  const handleFilterChange = (filter: CalendarTypeFilter) => updateUrl(month, filter);

  const handleDayClick = (day: CalendarDayType) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDay(null);
  };

  // Calculate stats
  const totalReleases = releases.reduce((sum, r) => sum + r.items.length, 0);
  const movieCount = releases.reduce(
    (sum, r) => sum + r.items.filter((i) => i.type === 'movie').length,
    0
  );
  const tvCount = releases.reduce(
    (sum, r) => sum + r.items.filter((i) => i.type === 'tv').length,
    0
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-text-primary">Release Calendar</h1>
          <p className="mt-2 text-text-secondary">
            Track upcoming movie releases and TV show episodes
          </p>
        </div>
      </div>

      {/* Filters & Stats */}
      <div className="border-b border-border-subtle bg-bg-secondary/50">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CalendarFilters
              activeFilter={typeFilter}
              onFilterChange={handleFilterChange}
            />

            {/* Stats (always rendered, so the bar keeps its height while loading) */}
            <div
              className={cn(
                'flex items-center gap-4 text-sm text-text-secondary transition-opacity',
                isLoading && (previous ? 'opacity-50' : 'invisible')
              )}
              aria-hidden={isLoading && !previous}
            >
              <span>
                <span className="font-medium text-text-primary">{totalReleases}</span> releases
              </span>
              {typeFilter === 'all' && (
                <>
                  <span className="hidden sm:inline">|</span>
                  <span className="hidden sm:inline">
                    <span className="font-medium text-badge-movie">{movieCount}</span> movies
                  </span>
                  <span className="hidden sm:inline">
                    <span className="font-medium text-badge-tv">{tvCount}</span> TV episodes
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-error/20 bg-error/10 p-6 text-center">
            <p className="text-error">{error}</p>
            <button
              onClick={retry}
              className="mt-4 rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div
            className={cn('transition-opacity duration-200', isLoading && 'opacity-60')}
            aria-busy={isLoading}
          >
            <Calendar
              month={month}
              releases={releases}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
            />
          </div>
        )}
      </div>

      {/* Release Modal */}
      <ReleaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        day={selectedDay}
      />
    </div>
  );
}
