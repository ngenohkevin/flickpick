'use client';

// ==========================================================================
// Cast Section Component
// Horizontal scroll of cast members with profile photos
// ==========================================================================

import { useRef } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { getProfileUrl } from '@/lib/utils';
import { SkeletonCastRow } from '@/components/ui';
import type { CastMember } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface CastSectionProps {
  cast?: CastMember[];
  maxItems?: number;
  className?: string;
  isLoading?: boolean;
  loadingCount?: number;
}

// ==========================================================================
// Cast Section Component
// ==========================================================================

export function CastSection({
  cast = [],
  maxItems = 20,
  className = '',
  isLoading = false,
  loadingCount = 12,
}: CastSectionProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const displayCast = cast.slice(0, maxItems);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <div className={className}>
        <SkeletonCastRow count={loadingCount} />
      </div>
    );
  }

  if (displayCast.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <section className={className}>
      <h2 className="mb-4 text-xl font-semibold text-text-primary sm:mb-6 sm:text-2xl">
        Cast
      </h2>

      <div className="group relative">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated text-text-primary opacity-0 shadow-lg transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-bg-elevated text-text-primary opacity-0 shadow-lg transition-opacity hover:bg-bg-tertiary group-hover:opacity-100 md:flex"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        {/* Cast Cards */}
        <div
          ref={scrollContainerRef}
          className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        >
          {displayCast.map((person) => (
            <CastCard key={person.id} person={person} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ==========================================================================
// Cast Card Component
// ==========================================================================

interface CastCardProps {
  person: CastMember;
}

function CastCard({ person }: CastCardProps) {
  const profileUrl = getProfileUrl(person.profile_path, 'medium');
  const hasPhoto = person.profile_path !== null;

  return (
    <div className="w-32 flex-shrink-0 snap-start sm:w-36">
      {/* Photo */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-bg-tertiary">
        {hasPhoto ? (
          <Image
            src={profileUrl}
            alt={person.name}
            fill
            className="object-cover"
            sizes="(min-width: 640px) 144px, 128px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <User className="h-12 w-12 text-text-tertiary" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2">
        <p className="truncate text-sm font-medium text-text-primary">
          {person.name}
        </p>
        <p className="truncate text-xs text-text-tertiary">{person.character}</p>
      </div>
    </div>
  );
}
