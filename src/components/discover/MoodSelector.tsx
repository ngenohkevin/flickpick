'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { MOODS } from '@/lib/constants';
import type { Mood } from '@/types';

// ==========================================================================
// Mood Selector Component
// Displays mood options as clickable cards or pills for discovery
// ==========================================================================

interface MoodSelectorProps {
  /** Display variant: 'cards' for larger cards, 'pills' for compact pills */
  variant?: 'cards' | 'pills';
  /** Currently selected mood slug (for highlighting) */
  selectedMood?: string;
  /** Callback when a mood is selected (for controlled mode) */
  onMoodSelect?: (mood: Mood) => void;
  /** Max number of moods to display (default: all) */
  limit?: number;
  /** Additional class names */
  className?: string;
  /** Whether to show all moods or just featured ones */
  showAll?: boolean;
}

/**
 * MoodSelector Component
 *
 * A reusable component for displaying mood options. Can be used in two modes:
 * 1. Navigation mode (default): Links to /mood/[slug] pages
 * 2. Controlled mode: Calls onMoodSelect callback when a mood is clicked
 *
 * @example
 * // Navigation mode (links to mood pages)
 * <MoodSelector variant="cards" />
 *
 * @example
 * // Controlled mode (callback on selection)
 * <MoodSelector
 *   variant="pills"
 *   selectedMood="cozy"
 *   onMoodSelect={(mood) => console.log(mood.slug)}
 * />
 */
export function MoodSelector({
  variant = 'pills',
  selectedMood,
  onMoodSelect,
  limit,
  className,
  showAll = true,
}: MoodSelectorProps) {
  const moods = showAll ? MOODS : MOODS.slice(0, 5); // Featured moods
  const displayMoods = limit ? moods.slice(0, limit) : moods;

  if (variant === 'cards') {
    return (
      <div className={cn('grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
        {displayMoods.map((mood) => (
          <MoodCard
            key={mood.slug}
            mood={mood}
            isSelected={selectedMood === mood.slug}
            onSelect={onMoodSelect}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayMoods.map((mood) => (
        <MoodPill
          key={mood.slug}
          mood={mood}
          isSelected={selectedMood === mood.slug}
          onSelect={onMoodSelect}
        />
      ))}
    </div>
  );
}

// ==========================================================================
// Mood Card (Large variant)
// ==========================================================================

interface MoodCardProps {
  mood: Mood;
  isSelected?: boolean;
  onSelect?: (mood: Mood) => void;
}

function MoodCard({ mood, isSelected = false, onSelect }: MoodCardProps) {
  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl p-4 transition-all duration-300',
        'bg-gradient-to-br',
        mood.gradient,
        'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20',
        isSelected && 'ring-2 ring-white ring-offset-2 ring-offset-bg-primary'
      )}
    >
      {/* Overlay for depth */}
      <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/10" />

      {/* Content */}
      <div className="relative z-10">
        <span className="text-3xl">{mood.emoji}</span>
        <h3 className="mt-2 font-semibold text-white">{mood.name}</h3>
        <p className="mt-1 text-xs text-white/80 line-clamp-2">{mood.description}</p>
      </div>
    </div>
  );

  if (onSelect) {
    return (
      <button
        onClick={() => onSelect(mood)}
        className="w-full text-left"
        aria-pressed={isSelected}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={`/mood/${mood.slug}`} className="block">
      {content}
    </Link>
  );
}

// ==========================================================================
// Mood Pill (Compact variant)
// ==========================================================================

interface MoodPillProps {
  mood: Mood;
  isSelected?: boolean;
  onSelect?: (mood: Mood) => void;
}

function MoodPill({ mood, isSelected = false, onSelect }: MoodPillProps) {
  const content = (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium',
        'transition-all duration-200',
        isSelected
          ? `bg-gradient-to-r ${mood.gradient} text-white shadow-lg`
          : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border-subtle hover:border-border-default'
      )}
    >
      <span>{mood.emoji}</span>
      <span>{mood.name}</span>
    </span>
  );

  if (onSelect) {
    return (
      <button onClick={() => onSelect(mood)} aria-pressed={isSelected}>
        {content}
      </button>
    );
  }

  return <Link href={`/mood/${mood.slug}`}>{content}</Link>;
}

// ==========================================================================
// Featured Moods (for homepage sections)
// ==========================================================================

interface FeaturedMoodsProps {
  className?: string;
}

/**
 * FeaturedMoods Component
 *
 * Displays a selection of featured moods as gradient cards
 * Designed for homepage or prominent placement
 */
export function FeaturedMoods({ className }: FeaturedMoodsProps) {
  // Featured moods (most popular/engaging)
  const featuredMoods = MOODS.slice(0, 6);

  return (
    <section className={className}>
      <h2 className="mb-4 text-lg font-semibold text-text-primary sm:text-xl">
        Browse by Mood
      </h2>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
        {featuredMoods.map((mood) => (
          <Link
            key={mood.slug}
            href={`/mood/${mood.slug}`}
            className={cn(
              'group relative overflow-hidden rounded-xl p-4 transition-all duration-300',
              'bg-gradient-to-br',
              mood.gradient,
              'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20',
              'min-h-[100px] flex flex-col justify-end'
            )}
          >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/10" />

            {/* Content */}
            <div className="relative z-10">
              <span className="text-2xl sm:text-3xl">{mood.emoji}</span>
              <h3 className="mt-1 text-sm font-semibold text-white sm:text-base">{mood.name}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ==========================================================================
// Mood Grid (Full grid with all moods)
// ==========================================================================

interface MoodGridProps {
  className?: string;
  excludeMood?: string; // Exclude a specific mood (e.g., current mood on mood page)
}

/**
 * MoodGrid Component
 *
 * Displays all moods in a responsive grid layout
 * Suitable for dedicated mood browsing section
 */
export function MoodGrid({ className, excludeMood }: MoodGridProps) {
  const moods = excludeMood ? MOODS.filter((m) => m.slug !== excludeMood) : MOODS;

  return (
    <div className={cn('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5', className)}>
      {moods.map((mood) => (
        <Link
          key={mood.slug}
          href={`/mood/${mood.slug}`}
          className={cn(
            'group relative overflow-hidden rounded-xl transition-all duration-300',
            'bg-gradient-to-br',
            mood.gradient,
            'hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20',
            'aspect-[4/3] flex flex-col justify-between p-4'
          )}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/20 transition-opacity group-hover:bg-black/10" />

          {/* Emoji */}
          <span className="relative z-10 text-4xl">{mood.emoji}</span>

          {/* Text */}
          <div className="relative z-10">
            <h3 className="font-semibold text-white text-lg">{mood.name}</h3>
            <p className="mt-0.5 text-xs text-white/80 line-clamp-2">{mood.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default MoodSelector;
