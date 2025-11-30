import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GenrePageContent } from './GenrePageContent';
import { SkeletonGrid } from '@/components/ui';
import { MOVIE_GENRES, TV_GENRES, GENRE_SLUGS } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

interface GenrePageProps {
  params: Promise<{
    type: string;
    slug: string;
  }>;
}

// ==========================================================================
// Helper Functions
// ==========================================================================

function getGenreFromSlug(slug: string, type: 'movie' | 'tv'): { id: number; name: string } | null {
  const genreId = GENRE_SLUGS[slug.toLowerCase()];
  if (!genreId) return null;

  const genreList = type === 'movie' ? MOVIE_GENRES : TV_GENRES;
  const genreName = genreList[genreId];

  if (!genreName) return null;

  return { id: genreId, name: genreName };
}

function getGenreDescription(genreName: string, type: 'movie' | 'tv'): string {
  const descriptions: Record<string, string> = {
    Action: 'High-octane thrills, explosive sequences, and adrenaline-pumping excitement',
    Adventure: 'Epic journeys, daring expeditions, and exciting discoveries',
    Animation: 'Beautifully crafted animated stories for all ages',
    Comedy: 'Laugh-out-loud entertainment and feel-good humor',
    Crime: 'Gripping tales of criminals, detectives, and justice',
    Documentary: 'Real stories and fascinating explorations of our world',
    Drama: 'Compelling narratives and emotional storytelling',
    Family: 'Wholesome entertainment the whole family can enjoy',
    Fantasy: 'Magical worlds, mythical creatures, and enchanting tales',
    History: 'Stories from the past that shaped our present',
    Horror: 'Spine-tingling scares and terrifying thrills',
    Music: 'Stories that celebrate the power of music',
    Mystery: 'Puzzling cases and intriguing whodunits',
    Romance: 'Heartwarming love stories and passionate connections',
    'Science Fiction': 'Futuristic adventures and mind-bending concepts',
    Thriller: 'Edge-of-your-seat suspense and nail-biting tension',
    War: 'Powerful stories of conflict, courage, and sacrifice',
    Western: 'Tales of the frontier and the Wild West',
    'Action & Adventure': 'Thrilling adventures packed with action',
    'Sci-Fi & Fantasy': 'Mind-bending science fiction and magical fantasy',
    'War & Politics': 'Stories of conflict, power, and political intrigue',
  };

  const typeLabel = type === 'movie' ? 'movies' : 'TV shows';
  return descriptions[genreName] || `Discover the best ${genreName.toLowerCase()} ${typeLabel}`;
}

// ==========================================================================
// Metadata
// ==========================================================================

export async function generateMetadata({ params }: GenrePageProps): Promise<Metadata> {
  const { type, slug } = await params;

  if (type !== 'movie' && type !== 'tv') {
    return { title: 'Genre Not Found' };
  }

  const genre = getGenreFromSlug(slug, type as 'movie' | 'tv');
  if (!genre) {
    return { title: 'Genre Not Found' };
  }

  const typeLabel = type === 'movie' ? 'Movies' : 'TV Shows';
  const title = `${genre.name} ${typeLabel}`;
  const description = getGenreDescription(genre.name, type as 'movie' | 'tv');

  return {
    title: `${title} | FlickPick`,
    description: `${description}. Browse and discover the best ${genre.name.toLowerCase()} ${typeLabel.toLowerCase()}.`,
    openGraph: {
      title: `${title} | FlickPick`,
      description: `${description}. Browse and discover the best ${genre.name.toLowerCase()} ${typeLabel.toLowerCase()}.`,
      type: 'website',
    },
  };
}

// ==========================================================================
// Static Params Generation
// ==========================================================================

export async function generateStaticParams() {
  const params: { type: string; slug: string }[] = [];

  // Generate params for movie genres
  Object.entries(GENRE_SLUGS).forEach(([slug, id]) => {
    if (MOVIE_GENRES[id]) {
      params.push({ type: 'movie', slug });
    }
  });

  // Generate params for TV genres
  Object.entries(GENRE_SLUGS).forEach(([slug, id]) => {
    if (TV_GENRES[id]) {
      params.push({ type: 'tv', slug });
    }
  });

  return params;
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function GenrePage({ params }: GenrePageProps) {
  const { type, slug } = await params;

  // Validate type
  if (type !== 'movie' && type !== 'tv') {
    notFound();
  }

  // Get genre info
  const genre = getGenreFromSlug(slug, type as 'movie' | 'tv');
  if (!genre) {
    notFound();
  }

  const typeLabel = type === 'movie' ? 'Movies' : 'TV Shows';
  const description = getGenreDescription(genre.name, type as 'movie' | 'tv');

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          <div className="border-b border-border-subtle">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="h-10 w-64 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <SkeletonGrid count={20} columns={6} />
          </div>
        </div>
      }
    >
      <GenrePageContent
        genreId={genre.id}
        genreName={genre.name}
        type={type as 'movie' | 'tv'}
        typeLabel={typeLabel}
        description={description}
      />
    </Suspense>
  );
}
