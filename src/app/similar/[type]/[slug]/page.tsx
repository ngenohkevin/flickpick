import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SimilarPageContent } from './SimilarPageContent';
import { SkeletonGrid, SkeletonHero } from '@/components/ui';
import { getMovieDetails } from '@/lib/tmdb/movies';
import { getTVShowDetails } from '@/lib/tmdb/tv';
import { getTrendingMovies, getTrendingTVShows } from '@/lib/tmdb';
import { createSlug, extractYear } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface PageProps {
  params: Promise<{
    type: string;
    slug: string;
  }>;
}

type MediaType = 'movie' | 'tv';

// ==========================================================================
// Helper Functions
// ==========================================================================

function isValidMediaType(type: string): type is MediaType {
  return type === 'movie' || type === 'tv';
}

/**
 * Extract content ID from slug
 * Supports formats:
 * - Pure number: "27205"
 * - Slug with ID: "inception-27205"
 * - Slug with year: "inception-2010" (will search by title)
 */
function extractIdFromSlug(slug: string): number | null {
  // Check if slug is just a number
  const pureNumber = parseInt(slug, 10);
  if (!isNaN(pureNumber) && String(pureNumber) === slug) {
    return pureNumber;
  }

  // Try to extract ID from end of slug (format: title-id)
  const parts = slug.split('-');
  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    const possibleId = parseInt(lastPart, 10);
    // TMDB IDs are typically larger numbers (not years like 2010, 2024)
    if (!isNaN(possibleId) && possibleId > 3000) {
      return possibleId;
    }
  }

  return null;
}

// ==========================================================================
// Metadata Generation
// ==========================================================================

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, slug } = await params;

  if (!isValidMediaType(type)) {
    return { title: 'Not Found | FlickPick' };
  }

  const contentId = extractIdFromSlug(slug);
  if (!contentId) {
    return { title: 'Similar Content | FlickPick' };
  }

  try {
    let title: string;
    let year: number | undefined;

    if (type === 'movie') {
      const movie = await getMovieDetails(contentId);
      title = movie.title;
      year = extractYear(movie.release_date);
    } else {
      const show = await getTVShowDetails(contentId);
      title = show.name;
      year = extractYear(show.first_air_date);
    }

    const pageTitle = `Similar to ${title}${year ? ` (${year})` : ''} | FlickPick`;
    const description = `Find movies and TV shows similar to ${title}. Discover recommendations based on genre, style, and themes.`;

    return {
      title: pageTitle,
      description,
      openGraph: {
        title: pageTitle,
        description,
        type: 'website',
      },
    };
  } catch {
    return {
      title: 'Similar Content | FlickPick',
      description: 'Find similar movies and TV shows based on your favorites.',
    };
  }
}

// ==========================================================================
// Static Params Generation
// ==========================================================================

export async function generateStaticParams() {
  const params: { type: string; slug: string }[] = [];

  try {
    // Get trending movies and TV shows for pre-rendering
    const [trendingMovies, trendingShows] = await Promise.all([
      getTrendingMovies('week', 1),
      getTrendingTVShows('week', 1),
    ]);

    // Add top 10 trending movies
    const movies = trendingMovies.results?.slice(0, 10) ?? [];
    for (const movie of movies) {
      const year = extractYear(movie.release_date);
      const slug = `${createSlug(movie.title)}-${movie.id}`;
      params.push({ type: 'movie', slug });
    }

    // Add top 10 trending TV shows
    const shows = trendingShows.results?.slice(0, 10) ?? [];
    for (const show of shows) {
      const slug = `${createSlug(show.name)}-${show.id}`;
      params.push({ type: 'tv', slug });
    }
  } catch (error) {
    console.error('Error generating static params for similar pages:', error);
  }

  return params;
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function SimilarPage({ params }: PageProps) {
  const { type, slug } = await params;

  // Validate type
  if (!isValidMediaType(type)) {
    notFound();
  }

  // Extract ID from slug
  const contentId = extractIdFromSlug(slug);
  if (!contentId) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          {/* Hero Skeleton */}
          <div className="relative h-[50vh] min-h-[400px]">
            <div className="absolute inset-0 bg-bg-tertiary animate-pulse" />
            <div className="container relative pt-32 pb-8">
              <div className="h-4 w-32 bg-bg-tertiary rounded animate-pulse mb-6" />
              <div className="flex gap-10">
                <div className="hidden lg:block w-48 h-72 bg-bg-tertiary rounded-lg animate-pulse" />
                <div className="flex-1 space-y-4">
                  <div className="h-6 w-24 bg-bg-tertiary rounded animate-pulse" />
                  <div className="h-10 w-96 bg-bg-tertiary rounded animate-pulse" />
                  <div className="h-4 w-64 bg-bg-tertiary rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-bg-tertiary rounded-full animate-pulse" />
                    <div className="h-8 w-20 bg-bg-tertiary rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Skeleton */}
          <div className="container py-8">
            <div className="h-6 w-64 bg-bg-tertiary rounded animate-pulse mb-4" />
            <div className="grid sm:grid-cols-3 gap-3 mb-12">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded-lg animate-pulse" />
              ))}
            </div>

            <div className="h-8 w-48 bg-bg-tertiary rounded animate-pulse mb-6" />
            <SkeletonGrid count={12} columns={6} />
          </div>
        </div>
      }
    >
      <SimilarPageContent type={type} contentId={contentId} />
    </Suspense>
  );
}

// Revalidate every 24 hours
export const revalidate = 86400;
