'use client';

import Link from 'next/link';
import type { Genre } from '@/types';

// ==========================================================================
// RelatedGenres Component
// Genre pills for navigating to genre pages
// ==========================================================================

interface RelatedGenresProps {
  genres: Genre[];
  mediaType: 'movie' | 'tv';
  className?: string;
}

export function RelatedGenres({ genres, mediaType, className = '' }: RelatedGenresProps) {
  if (genres.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Explore Related Genres
      </h2>

      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const slug = genre.name.toLowerCase().replace(/\s+&\s+/g, '-').replace(/\s+/g, '-');
          return (
            <Link
              key={genre.id}
              href={`/genre/${mediaType}/${slug}`}
              className="rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
            >
              {genre.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
