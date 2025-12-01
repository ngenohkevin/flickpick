'use client';

import type { CalendarDay as CalendarDayType, ContentType } from '@/types';

// ==========================================================================
// CalendarDay Component
// Individual day cell in the calendar grid
// ==========================================================================

interface CalendarDayProps {
  day: CalendarDayType;
  onClick: () => void;
}

export function CalendarDay({ day, onClick }: CalendarDayProps) {
  const hasReleases = day.releases.length > 0;
  const visibleReleases = day.releases.slice(0, 3);
  const remainingCount = day.releases.length - 3;

  return (
    <div
      onClick={onClick}
      className={`
        min-h-[100px] rounded-lg border p-2 transition-colors
        ${day.isCurrentMonth ? 'bg-bg-secondary' : 'bg-bg-primary/50'}
        ${day.isToday ? 'border-accent-primary bg-accent-light/10' : 'border-border-subtle'}
        ${hasReleases ? 'cursor-pointer hover:border-border-default hover:bg-bg-tertiary' : ''}
        ${!day.isCurrentMonth ? 'opacity-50' : ''}
      `}
      role={hasReleases ? 'button' : undefined}
      tabIndex={hasReleases ? 0 : undefined}
      onKeyDown={(e) => {
        if (hasReleases && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${day.dayNumber}${day.isToday ? ' (Today)' : ''}${hasReleases ? `, ${day.releases.length} releases` : ''}`}
    >
      {/* Day Number */}
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`
            text-sm font-medium
            ${day.isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary text-white' : ''}
            ${day.isCurrentMonth ? 'text-text-primary' : 'text-text-tertiary'}
          `}
        >
          {day.dayNumber}
        </span>
        {hasReleases && (
          <span className="text-xs text-text-tertiary">
            {day.releases.length}
          </span>
        )}
      </div>

      {/* Release Items */}
      <div className="space-y-1">
        {visibleReleases.map((release) => (
          <ReleaseIndicator
            key={`${release.type}-${release.id}`}
            title={release.title}
            contentType={release.content_type}
            episode={release.episode}
          />
        ))}
        {remainingCount > 0 && (
          <span className="block text-xs text-text-tertiary">
            +{remainingCount} more
          </span>
        )}
      </div>
    </div>
  );
}

// ==========================================================================
// ReleaseIndicator Component
// Small indicator for a release within a day cell
// ==========================================================================

interface ReleaseIndicatorProps {
  title: string;
  contentType: ContentType;
  episode?: {
    season: number;
    episode: number;
    name: string;
  };
}

function ReleaseIndicator({ title, contentType, episode }: ReleaseIndicatorProps) {
  const colorClass = getContentTypeColor(contentType);

  return (
    <div
      className={`truncate rounded px-1.5 py-0.5 text-xs ${colorClass}`}
      title={episode ? `${title} S${episode.season}E${episode.episode}` : title}
    >
      {episode ? (
        <span>
          <span className="font-medium">S{episode.season}E{episode.episode}</span>
          <span className="hidden sm:inline"> {title}</span>
        </span>
      ) : (
        title
      )}
    </div>
  );
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function getContentTypeColor(contentType: ContentType): string {
  switch (contentType) {
    case 'movie':
      return 'bg-badge-movie/20 text-badge-movie';
    case 'tv':
      return 'bg-badge-tv/20 text-badge-tv';
    case 'animation':
      return 'bg-badge-animation/20 text-badge-animation';
    case 'anime':
      return 'bg-badge-anime/20 text-badge-anime';
    default:
      return 'bg-bg-tertiary text-text-secondary';
  }
}
