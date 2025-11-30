'use client';

import Link from 'next/link';
import {
  Swords,
  Mountain,
  Palette,
  Laugh,
  Skull,
  FileText,
  Drama,
  Users,
  Sparkles,
  BookOpen,
  Ghost,
  Music,
  Search,
  Heart,
  Rocket,
  Zap,
  Shield,
  Compass,
} from 'lucide-react';
import { MOVIE_GENRES, TV_GENRES, GENRE_SLUGS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface GenreGridProps {
  type: 'movie' | 'tv';
  className?: string;
}

// ==========================================================================
// Genre Icon Mapping
// ==========================================================================

const GENRE_ICONS: Record<number, React.ElementType> = {
  28: Swords,      // Action
  12: Mountain,    // Adventure
  16: Palette,     // Animation
  35: Laugh,       // Comedy
  80: Skull,       // Crime
  99: FileText,    // Documentary
  18: Drama,       // Drama (using the component name)
  10751: Users,    // Family
  14: Sparkles,    // Fantasy
  36: BookOpen,    // History
  27: Ghost,       // Horror
  10402: Music,    // Music
  9648: Search,    // Mystery
  10749: Heart,    // Romance
  878: Rocket,     // Science Fiction
  10770: Drama,    // TV Movie
  53: Zap,         // Thriller
  10752: Shield,   // War
  37: Compass,     // Western
  // TV specific
  10759: Swords,   // Action & Adventure
  10762: Users,    // Kids
  10763: FileText, // News
  10764: Drama,    // Reality
  10765: Rocket,   // Sci-Fi & Fantasy
  10766: Heart,    // Soap
  10767: Users,    // Talk
  10768: Shield,   // War & Politics
};

// ==========================================================================
// Genre Colors (gradients)
// ==========================================================================

const GENRE_COLORS: Record<number, string> = {
  28: 'from-red-500 to-orange-500',      // Action
  12: 'from-emerald-500 to-teal-500',    // Adventure
  16: 'from-pink-500 to-purple-500',     // Animation
  35: 'from-yellow-400 to-orange-400',   // Comedy
  80: 'from-gray-600 to-gray-800',       // Crime
  99: 'from-blue-500 to-indigo-500',     // Documentary
  18: 'from-purple-500 to-indigo-600',   // Drama
  10751: 'from-green-400 to-emerald-500',// Family
  14: 'from-violet-500 to-purple-600',   // Fantasy
  36: 'from-amber-600 to-yellow-600',    // History
  27: 'from-gray-800 to-red-900',        // Horror
  10402: 'from-pink-400 to-rose-500',    // Music
  9648: 'from-slate-600 to-slate-800',   // Mystery
  10749: 'from-rose-400 to-pink-500',    // Romance
  878: 'from-cyan-500 to-blue-600',      // Science Fiction
  53: 'from-orange-500 to-red-600',      // Thriller
  10752: 'from-stone-500 to-stone-700',  // War
  37: 'from-amber-500 to-orange-600',    // Western
  // TV specific
  10759: 'from-red-500 to-orange-500',   // Action & Adventure
  10762: 'from-green-400 to-teal-400',   // Kids
  10765: 'from-violet-500 to-indigo-600',// Sci-Fi & Fantasy
  10768: 'from-stone-500 to-stone-700',  // War & Politics
};

// ==========================================================================
// Helper Functions
// ==========================================================================

function getGenreSlug(genreId: number): string {
  const entry = Object.entries(GENRE_SLUGS).find(([, id]) => id === genreId);
  return entry ? entry[0] : String(genreId);
}

// ==========================================================================
// Genre Grid Component
// ==========================================================================

export function GenreGrid({ type, className = '' }: GenreGridProps) {
  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  return (
    <div className={cn('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4', className)}>
      {Object.entries(genres).map(([id, name]) => {
        const genreId = parseInt(id, 10);
        const Icon = GENRE_ICONS[genreId] || Sparkles;
        const gradient = GENRE_COLORS[genreId] || 'from-gray-500 to-gray-600';
        const slug = getGenreSlug(genreId);

        return (
          <Link
            key={id}
            href={`/genre/${type}/${slug}`}
            className={cn(
              'group relative overflow-hidden rounded-xl p-6 transition-all duration-300',
              'hover:scale-105 hover:shadow-xl',
              `bg-gradient-to-br ${gradient}`
            )}
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20" />
              <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/20" />
            </div>

            {/* Content */}
            <div className="relative">
              <Icon className="h-8 w-8 text-white/90 mb-3" />
              <h3 className="font-semibold text-white text-lg">{name}</h3>
            </div>

            {/* Hover arrow */}
            <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="text-white/80">→</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ==========================================================================
// Compact Genre List (for sidebars)
// ==========================================================================

interface GenreListProps {
  type: 'movie' | 'tv';
  activeGenre?: number;
  className?: string;
}

export function GenreList({ type, activeGenre, className = '' }: GenreListProps) {
  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  return (
    <div className={cn('space-y-1', className)}>
      {Object.entries(genres).map(([id, name]) => {
        const genreId = parseInt(id, 10);
        const slug = getGenreSlug(genreId);
        const isActive = genreId === activeGenre;

        return (
          <Link
            key={id}
            href={`/genre/${type}/${slug}`}
            className={cn(
              'block rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-accent-primary text-white'
                : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}

// ==========================================================================
// Genre Pills (horizontal scroll)
// ==========================================================================

interface GenrePillsProps {
  type: 'movie' | 'tv';
  activeGenre?: number;
  className?: string;
}

export function GenrePills({ type, activeGenre, className = '' }: GenrePillsProps) {
  const genres = type === 'movie' ? MOVIE_GENRES : TV_GENRES;

  return (
    <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide pb-2', className)}>
      {Object.entries(genres).map(([id, name]) => {
        const genreId = parseInt(id, 10);
        const slug = getGenreSlug(genreId);
        const isActive = genreId === activeGenre;

        return (
          <Link
            key={id}
            href={`/genre/${type}/${slug}`}
            className={cn(
              'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
            )}
          >
            {name}
          </Link>
        );
      })}
    </div>
  );
}
