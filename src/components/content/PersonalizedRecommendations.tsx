'use client';

import { useEffect, useState, useCallback } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { ContentRow } from './ContentRow';
import { useWatchlistItems } from '@/stores/watchlist';
import type { Content, WatchlistItem } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface BecauseYouLikedResult {
  sourceItem: WatchlistItem;
  recommendations: Content[];
}

interface GenreRecommendationsResult {
  genreName: string;
  genreId: number;
  recommendations: Content[];
  type: 'movie' | 'tv';
}

interface RecommendationsResponse {
  becauseYouLiked: BecauseYouLikedResult | null;
  topGenres: GenreRecommendationsResult[];
}

// ==========================================================================
// Component
// ==========================================================================

export function PersonalizedRecommendations() {
  const watchlistItems = useWatchlistItems();
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations when watchlist changes
  const fetchRecommendations = useCallback(async () => {
    if (watchlistItems.length === 0) {
      setRecommendations(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          watchlistItems: watchlistItems.slice(0, 20), // Limit for performance
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      const data = (await response.json()) as RecommendationsResponse;
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Unable to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [watchlistItems]);

  useEffect(() => {
    // Debounce to avoid too many requests
    const timer = setTimeout(fetchRecommendations, 500);
    return () => clearTimeout(timer);
  }, [fetchRecommendations]);

  // Don't render if no watchlist items
  if (watchlistItems.length === 0) {
    return null;
  }

  // Show loading state
  if (isLoading && !recommendations) {
    return (
      <section className="space-y-12">
        <div className="animate-pulse">
          <div className="mb-4 h-8 w-64 rounded bg-bg-tertiary sm:mb-6" />
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="w-36 flex-shrink-0 sm:w-44 md:w-48">
                <div className="aspect-[2/3] rounded-lg bg-bg-tertiary" />
                <div className="mt-2 h-4 w-3/4 rounded bg-bg-tertiary" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Don't render if error or no recommendations
  if (error || !recommendations) {
    return null;
  }

  const { becauseYouLiked, topGenres } = recommendations;

  // Don't render if no recommendations to show
  if (!becauseYouLiked && topGenres.length === 0) {
    return null;
  }

  return (
    <section className="space-y-12">
      {/* Personalized header */}
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Sparkles className="h-4 w-4 text-accent-primary" />
        <span>Personalized for you</span>
        <span className="text-text-tertiary">
          ({watchlistItems.length} title{watchlistItems.length !== 1 ? 's' : ''} in your watchlist)
        </span>
      </div>

      {/* Because you liked X */}
      {becauseYouLiked && becauseYouLiked.recommendations.length > 0 && (
        <ContentRow
          title={`Because you liked "${becauseYouLiked.sourceItem.title}"`}
          items={becauseYouLiked.recommendations}
          href={`/similar/${becauseYouLiked.sourceItem.media_type}/${becauseYouLiked.sourceItem.id}`}
          showTypeBadge={true}
          showRating={true}
        />
      )}

      {/* Top genre recommendations */}
      {topGenres.map((genre) => (
        <ContentRow
          key={`${genre.genreId}-${genre.type}`}
          title={`More ${genre.genreName} for you`}
          items={genre.recommendations}
          href={`/genre/${genre.type}/${genre.genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
          showTypeBadge={genre.type === 'tv'}
          showRating={true}
        />
      ))}

      {/* Empty watchlist prompt - only show if we have items but no recommendations came back */}
      {!becauseYouLiked && topGenres.length === 0 && (
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-6 text-center">
          <Heart className="mx-auto h-8 w-8 text-text-tertiary" />
          <h3 className="mt-3 font-semibold text-text-primary">
            Add more titles for better recommendations
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            The more titles you save to your watchlist, the better we can personalize your
            recommendations.
          </p>
          <Link
            href="/movies"
            className="mt-4 inline-block rounded-full bg-accent-primary px-4 py-2 text-sm font-medium text-text-inverse hover:bg-accent-hover"
          >
            Browse movies
          </Link>
        </div>
      )}
    </section>
  );
}
