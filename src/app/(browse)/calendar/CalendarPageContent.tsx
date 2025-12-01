'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, CalendarFilters, ReleaseModal, type CalendarTypeFilter } from '@/components/calendar';
import type { CalendarDay as CalendarDayType, CalendarRelease, CalendarResponse } from '@/types';

// ==========================================================================
// CalendarPageContent Component
// Client-side calendar page with data fetching and state management
// ==========================================================================

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function CalendarPageContent() {
  // State
  const [month, setMonth] = useState(getCurrentMonth);
  const [typeFilter, setTypeFilter] = useState<CalendarTypeFilter>('all');
  const [releases, setReleases] = useState<CalendarRelease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<CalendarDayType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch calendar data
  const fetchCalendarData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        month,
        type: typeFilter,
      });

      const response = await fetch(`/api/calendar?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }

      const data: CalendarResponse = await response.json();
      setReleases(data.releases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setReleases([]);
    } finally {
      setIsLoading(false);
    }
  }, [month, typeFilter]);

  // Fetch data when month or filter changes
  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  // Event handlers
  const handleMonthChange = (newMonth: string) => {
    setMonth(newMonth);
  };

  const handleFilterChange = (filter: CalendarTypeFilter) => {
    setTypeFilter(filter);
  };

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

            {/* Stats */}
            {!isLoading && (
              <div className="flex items-center gap-4 text-sm text-text-secondary">
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
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-lg border border-error/20 bg-error/10 p-6 text-center">
            <p className="text-error">{error}</p>
            <button
              onClick={fetchCalendarData}
              className="mt-4 rounded-md bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90"
            >
              Try Again
            </button>
          </div>
        ) : isLoading ? (
          <CalendarSkeleton />
        ) : (
          <Calendar
            month={month}
            releases={releases}
            onMonthChange={handleMonthChange}
            onDayClick={handleDayClick}
          />
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

// ==========================================================================
// CalendarSkeleton Component
// Loading skeleton for the calendar
// ==========================================================================

function CalendarSkeleton() {
  return (
    <div className="w-full">
      {/* Header Skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-8 w-48 animate-pulse rounded bg-bg-tertiary" />
          <div className="h-8 w-16 animate-pulse rounded bg-bg-tertiary" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 animate-pulse rounded bg-bg-tertiary" />
          <div className="h-10 w-10 animate-pulse rounded bg-bg-tertiary" />
        </div>
      </div>

      {/* Days Header Skeleton */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-bg-tertiary" />
        ))}
      </div>

      {/* Calendar Grid Skeleton */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[100px] animate-pulse rounded-lg border border-border-subtle bg-bg-tertiary"
          />
        ))}
      </div>
    </div>
  );
}
