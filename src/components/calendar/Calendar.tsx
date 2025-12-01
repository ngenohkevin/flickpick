'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarDay } from './CalendarDay';
import type { CalendarDay as CalendarDayType, CalendarRelease } from '@/types';

// ==========================================================================
// Calendar Component
// Monthly calendar view for release dates
// ==========================================================================

interface CalendarProps {
  month: string; // YYYY-MM format
  releases: CalendarRelease[];
  onMonthChange: (month: string) => void;
  onDayClick: (day: CalendarDayType) => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function Calendar({ month, releases, onMonthChange, onDayClick }: CalendarProps) {
  // Parse the month string
  const [yearStr, monthStr] = month.split('-');
  const year = parseInt(yearStr ?? new Date().getFullYear().toString(), 10);
  const monthIndex = parseInt(monthStr ?? '1', 10) - 1;

  // Build a map of date -> releases for quick lookup
  const releasesMap = useMemo(() => {
    const map = new Map<string, CalendarRelease['items']>();
    for (const release of releases) {
      map.set(release.date, release.items);
    }
    return map;
  }, [releases]);

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDayType[] => {
    const days: CalendarDayType[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // First day of the month
    const firstDayOfMonth = new Date(year, monthIndex, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();

    // Last day of the month
    const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();

    // Days from previous month
    const prevMonth = new Date(year, monthIndex, 0);
    const daysInPrevMonth = prevMonth.getDate();

    // Add days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, monthIndex - 1, dayNum);
      const dateStr = formatDateString(date);
      days.push({
        date,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        releases: releasesMap.get(dateStr) ?? [],
      });
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, monthIndex, i);
      const dateStr = formatDateString(date);
      days.push({
        date,
        dayNumber: i,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        releases: releasesMap.get(dateStr) ?? [],
      });
    }

    // Add days from next month to fill the grid (6 rows x 7 days = 42)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, monthIndex + 1, i);
      const dateStr = formatDateString(date);
      days.push({
        date,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        releases: releasesMap.get(dateStr) ?? [],
      });
    }

    return days;
  }, [year, monthIndex, releasesMap]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    const prevDate = new Date(year, monthIndex - 1, 1);
    const newMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const goToNextMonth = () => {
    const nextDate = new Date(year, monthIndex + 1, 1);
    const newMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  const goToToday = () => {
    const today = new Date();
    const newMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  };

  return (
    <div className="w-full">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-text-primary">
            {MONTH_NAMES[monthIndex]} {year}
          </h2>
          <button
            onClick={goToToday}
            className="rounded-md border border-border-default bg-bg-tertiary px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="rounded-md p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-text-tertiary"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <CalendarDay
            key={`${day.date.toISOString()}-${index}`}
            day={day}
            onClick={() => day.releases.length > 0 && onDayClick(day)}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-badge-movie/30" />
          <span className="text-text-secondary">Movie</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-badge-tv/30" />
          <span className="text-text-secondary">TV Show</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-badge-animation/30" />
          <span className="text-text-secondary">Animation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-badge-anime/30" />
          <span className="text-text-secondary">Anime</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
