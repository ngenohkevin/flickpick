'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SimilarHero, WhyPeopleLove, RelatedGenres } from '@/components/similar';
import { ContentGrid } from '@/components/content/ContentGrid';
import { SkeletonGrid } from '@/components/ui';
import type { Movie, TVShow, Genre, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SimilarPageContentProps {
  type: 'movie' | 'tv';
  contentId: number;
}

interface SimilarContentData {
  source: {
    id: number;
    title: string;
    overview: string;
    tagline?: string;
    poster_path: string | null;
    backdrop_path: string | null;
    release_date: string;
    vote_average: number;
    vote_count: number;
    runtime?: number;
    genres: Genre[];
    content_type: ContentType;
    media_type: 'movie' | 'tv';
    number_of_seasons?: number;
    number_of_episodes?: number;
    status?: string;
  };
  similar: Array<Movie | TVShow>;
  traits: string[];
  related_genres: Genre[];
}

// ==========================================================================
// SimilarPageContent Component
// ==========================================================================

export function SimilarPageContent({ type, contentId }: SimilarPageContentProps) {
  const [data, setData] = useState<SimilarContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/similar/${type}/${contentId}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Content not found');
          }
          throw new Error('Failed to fetch similar content');
        }

        const result: SimilarContentData = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [type, contentId]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg-primary">
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-text-primary mb-4">
            {error === 'Content not found' ? 'Content Not Found' : 'Something went wrong'}
          </h1>
          <p className="text-text-secondary mb-6">
            {error === 'Content not found'
              ? "We couldn't find the content you're looking for."
              : 'Failed to load similar content. Please try again.'}
          </p>
          <Link
            href={type === 'movie' ? '/movies' : '/tv'}
            className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Browse {type === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </div>
      </div>
    );
  }

  const { source, similar, traits, related_genres } = data;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <SimilarHero
        id={source.id}
        title={source.title}
        overview={source.overview}
        tagline={source.tagline}
        posterPath={source.poster_path}
        backdropPath={source.backdrop_path}
        releaseDate={source.release_date}
        voteAverage={source.vote_average}
        voteCount={source.vote_count}
        runtime={source.runtime}
        genres={source.genres}
        contentType={source.content_type}
        mediaType={source.media_type}
        numberOfSeasons={source.number_of_seasons}
      />

      {/* Main Content */}
      <div className="container py-8 sm:py-12">
        {/* Why People Love Section */}
        {traits.length > 0 && (
          <WhyPeopleLove
            title={source.title}
            traits={traits}
            className="mb-10"
          />
        )}

        {/* Similar Content Section */}
        <section className="mb-10">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
              If You Liked {source.title}, Try These
            </h2>
            <span className="text-sm text-text-tertiary">
              {similar.length} results
            </span>
          </div>

          {similar.length > 0 ? (
            <ContentGrid items={similar} columns={6} showTypeBadge showRating />
          ) : (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-8 text-center">
              <p className="text-text-secondary">
                No similar content found. Try exploring by genre instead.
              </p>
            </div>
          )}
        </section>

        {/* Related Genres Section */}
        {related_genres.length > 0 && (
          <RelatedGenres
            genres={related_genres}
            mediaType={source.media_type}
            className="mb-10"
          />
        )}

        {/* More Actions */}
        <div className="flex flex-wrap gap-4 border-t border-border-subtle pt-8">
          <Link
            href={source.media_type === 'movie' ? `/movie/${source.id}` : `/tv/${source.id}`}
            className="rounded-md bg-bg-tertiary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-border-default"
          >
            View Full Details
          </Link>
          <Link
            href={source.media_type === 'movie' ? '/movies' : '/tv'}
            className="rounded-md border border-border-default bg-transparent px-6 py-3 font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            Browse All {source.media_type === 'movie' ? 'Movies' : 'TV Shows'}
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================================================
// Loading Skeleton
// ==========================================================================

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero Skeleton */}
      <div className="relative h-[50vh] min-h-[400px]">
        <div className="absolute inset-0 bg-bg-tertiary animate-pulse" />
        <div className="container relative pt-32 pb-8">
          <div className="h-4 w-32 bg-bg-secondary rounded animate-pulse mb-6" />
          <div className="flex gap-10">
            <div className="hidden lg:block w-48 h-72 bg-bg-secondary rounded-lg animate-pulse" />
            <div className="flex-1 space-y-4">
              <div className="h-6 w-24 bg-bg-secondary rounded animate-pulse" />
              <div className="h-10 w-96 max-w-full bg-bg-secondary rounded animate-pulse" />
              <div className="h-4 w-64 max-w-full bg-bg-secondary rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-bg-secondary rounded-full animate-pulse" />
                <div className="h-8 w-20 bg-bg-secondary rounded-full animate-pulse" />
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
  );
}
