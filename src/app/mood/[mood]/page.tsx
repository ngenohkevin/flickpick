'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DiscoverResults, DiscoverEmptyState, MoodSelector } from '@/components/discover';
import { useWatchlist, useWatchlistIdArray } from '@/stores/watchlist';
import { MOODS } from '@/lib/constants';
import type { DiscoverResponse, DiscoverError, EnrichedRecommendation } from '@/lib/ai/types';
import type { Content } from '@/types';

// ==========================================================================
// Mood Page
// Displays AI-powered recommendations for a specific mood
// ==========================================================================

export default function MoodPage() {
  const params = useParams();
  const mood = params.mood as string;

  // Find mood config
  const moodConfig = MOODS.find((m) => m.slug === mood);

  // Results state
  const [results, setResults] = useState<EnrichedRecommendation[]>([]);
  const [provider, setProvider] = useState<string | undefined>();
  const [isFallback, setIsFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watchlist integration
  const { toggleItem } = useWatchlist();
  const watchlistIdArray = useWatchlistIdArray();
  const watchlistIds = useMemo(() => new Set(watchlistIdArray), [watchlistIdArray]);

  // Fetch recommendations
  useEffect(() => {
    if (!mood) return;

    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/mood/${mood}`);
        const data = await response.json();

        if (!response.ok) {
          const errorData = data as DiscoverError;
          throw new Error(errorData.error || 'Failed to get recommendations');
        }

        const successData = data as DiscoverResponse;
        setResults(successData.results);
        setProvider(successData.provider);
        setIsFallback(successData.isFallback);
      } catch (err) {
        console.error('Mood fetch error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [mood]);

  // Handle watchlist toggle
  const handleWatchlistToggle = useCallback(
    (content: Content) => {
      toggleItem({
        id: content.id,
        title: 'title' in content ? content.title : content.name,
        media_type: content.media_type,
        content_type:
          content.media_type === 'movie'
            ? content.genre_ids?.includes(16)
              ? content.original_language === 'ja'
                ? 'anime'
                : 'animation'
              : 'movie'
            : content.genre_ids?.includes(16)
              ? (content.origin_country as string[] | undefined)?.includes('JP') ||
                content.original_language === 'ja'
                ? 'anime'
                : 'animation'
              : 'tv',
        poster_path: content.poster_path,
      });
    },
    [toggleItem]
  );

  // Invalid mood
  if (!moodConfig) {
    return (
      <main className="min-h-screen bg-bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-text-primary">Mood not found</h1>
          <p className="mt-2 text-text-secondary">
            The mood &quot;{mood}&quot; doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 text-accent-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${moodConfig.gradient} py-12 sm:py-16`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-5xl">{moodConfig.emoji}</span>
            <div>
              <h1 className="text-3xl font-bold text-white sm:text-4xl">
                {moodConfig.name}
              </h1>
              <p className="mt-1 text-lg text-white/80">{moodConfig.description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="font-medium text-red-400">Failed to load recommendations</p>
            <p className="mt-1 text-sm text-text-secondary">{error}</p>
          </div>
        ) : (
          <DiscoverResults
            results={results}
            isLoading={isLoading}
            provider={provider}
            isFallback={isFallback}
            watchlistIds={watchlistIds}
            onWatchlistToggle={handleWatchlistToggle}
          />
        )}

        {!isLoading && results.length === 0 && !error && (
          <DiscoverEmptyState hasSearched={true} />
        )}
      </section>

      {/* Other Moods */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">
          Explore other moods
        </h2>
        <MoodSelector
          variant="pills"
          selectedMood={mood}
        />
      </section>
    </main>
  );
}
