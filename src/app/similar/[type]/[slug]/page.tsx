import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SimilarPageContent } from './SimilarPageContent';
import { SkeletonGrid } from '@/components/ui';
import { getMovieDetails } from '@/lib/tmdb/movies';
import { getTVShowDetails } from '@/lib/tmdb/tv';
import { getTrendingMovies, getTrendingTVShows } from '@/lib/tmdb';
import { createSlug, extractYear } from '@/lib/utils';
import {
  generateBreadcrumbJsonLd,
  generateSimilarContentJsonLd,
  generateFAQJsonLd,
  generateSimilarFAQs,
} from '@/lib/jsonld';

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

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

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
// SEO-Optimized Metadata Generation
// Targets searches like "movies like X", "similar to X", "shows like X"
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
    let genres: string[] = [];
    let overview: string | undefined;
    let posterPath: string | null = null;
    let backdropPath: string | null = null;

    if (type === 'movie') {
      const movie = await getMovieDetails(contentId);
      title = movie.title;
      year = extractYear(movie.release_date);
      genres = movie.genres?.map((g) => g.name) || [];
      overview = movie.overview;
      posterPath = movie.poster_path;
      backdropPath = movie.backdrop_path;
    } else {
      const show = await getTVShowDetails(contentId);
      title = show.name;
      year = extractYear(show.first_air_date);
      genres = show.genres?.map((g) => g.name) || [];
      overview = show.overview;
      posterPath = show.poster_path;
      backdropPath = show.backdrop_path;
    }

    const typeLabel = type === 'tv' ? 'TV Shows' : 'Movies';
    const typeLabelLower = type === 'tv' ? 'TV shows' : 'movies';
    const genreText = genres.slice(0, 2).join(' & ') || 'similar';

    // SEO-optimized title targeting "movies like X" searches
    const pageTitle = `${typeLabel} Like ${title}${year ? ` (${year})` : ''} - Find Similar ${typeLabel}`;

    // SEO-optimized description with keywords
    const description =
      `Looking for ${typeLabelLower} similar to ${title}? ` +
      `Discover ${genreText} ${typeLabelLower} like ${title}${year ? ` (${year})` : ''}. ` +
      `Find your next favorite based on themes, style, and what fans also enjoy.`;

    // Canonical URL with proper slug format
    const canonicalSlug = `${createSlug(title)}-${contentId}`;
    const canonicalUrl = `${BASE_URL}/similar/${type}/${canonicalSlug}`;

    // OG image - use backdrop for social sharing
    const ogImage = backdropPath
      ? `https://image.tmdb.org/t/p/w1280${backdropPath}`
      : posterPath
        ? `https://image.tmdb.org/t/p/w500${posterPath}`
        : undefined;

    return {
      title: pageTitle,
      description,
      keywords: [
        `${typeLabelLower} like ${title}`,
        `similar to ${title}`,
        `${title} recommendations`,
        `if you liked ${title}`,
        `${genreText} ${typeLabelLower}`,
        type === 'movie' ? 'movie recommendations' : 'TV show recommendations',
        'similar movies',
        'similar shows',
        'what to watch',
        ...genres.map((g) => `${g.toLowerCase()} ${typeLabelLower}`),
      ],
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${typeLabel} Similar to ${title}${year ? ` (${year})` : ''} | FlickPick`,
        description,
        url: canonicalUrl,
        siteName: 'FlickPick',
        type: 'website',
        images: ogImage
          ? [
              {
                url: ogImage,
                width: 1280,
                height: 720,
                alt: `Find ${typeLabelLower} similar to ${title}`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: `${typeLabel} Like ${title} | FlickPick`,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    };
  } catch {
    return {
      title: 'Find Similar Movies & TV Shows | FlickPick',
      description:
        'Discover movies and TV shows similar to your favorites. Get personalized recommendations based on genre, style, and themes.',
    };
  }
}

// ==========================================================================
// Static Params Generation - Pre-render popular similar pages
// ==========================================================================

export async function generateStaticParams() {
  const params: { type: string; slug: string }[] = [];

  try {
    // Get trending movies and TV shows for pre-rendering
    // These are the most searched "similar to" queries
    const [trendingMovies, trendingShows] = await Promise.all([
      getTrendingMovies('week', 1),
      getTrendingTVShows('week', 1),
    ]);

    // Add top 10 trending movies
    const movies = trendingMovies.results?.slice(0, 10) ?? [];
    for (const movie of movies) {
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
// Page Component with JSON-LD Structured Data
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

  // Fetch content data for JSON-LD
  let title = '';
  let year: number | undefined;
  let genres: string[] = [];
  const typeLabel = type === 'tv' ? 'TV Shows' : 'Movies';

  try {
    if (type === 'movie') {
      const movie = await getMovieDetails(contentId);
      title = movie.title;
      year = extractYear(movie.release_date);
      genres = movie.genres?.map((g) => g.name) || [];
    } else {
      const show = await getTVShowDetails(contentId);
      title = show.name;
      year = extractYear(show.first_air_date);
      genres = show.genres?.map((g) => g.name) || [];
    }
  } catch {
    // Content will be fetched client-side if this fails
  }

  const canonicalSlug = title ? `${createSlug(title)}-${contentId}` : slug;
  const pageUrl = `${BASE_URL}/similar/${type}/${canonicalSlug}`;

  // Generate Breadcrumb JSON-LD
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: BASE_URL },
    { name: typeLabel, url: `${BASE_URL}/${type === 'movie' ? 'movies' : 'tv'}` },
    { name: title || 'Content', url: `${BASE_URL}/${type}/${contentId}` },
    { name: `Similar ${typeLabel}`, url: pageUrl },
  ]);

  // Generate Similar Content JSON-LD (without actual similar items - those are fetched client-side)
  const similarJsonLd = generateSimilarContentJsonLd(
    {
      sourceTitle: title || 'Content',
      sourceType: type,
      sourceId: contentId,
      sourceYear: year,
      sourceGenres: genres,
      similarItems: [], // Will be populated by client-side data
    },
    pageUrl
  );

  // Generate FAQ JSON-LD for featured snippets
  const faqJsonLd = title
    ? generateFAQJsonLd(
        generateSimilarFAQs(
          title,
          type,
          [] // Top similar titles would go here if available
        )
      )
    : null;

  return (
    <>
      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Similar Content ItemList JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(similarJsonLd) }}
      />

      {/* FAQ JSON-LD for featured snippets */}
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

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
    </>
  );
}

// Revalidate every 24 hours
export const revalidate = 86400;
