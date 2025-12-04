'use client';

// ==========================================================================
// Content Blend Page
// Blend 2-3 titles to find content that combines their essence
// ==========================================================================

import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Blend, Sparkles, ArrowRight } from 'lucide-react';
import {
  TitleSearch,
  SelectedTitles,
  BlendResults,
  BlendEmptyState,
} from '@/components/blend';
import type { SelectedTitle, BlendResultItem } from '@/components/blend';
import { useWatchlist, useWatchlistIdArray } from '@/stores/watchlist';
import type { Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface BlendResponse {
  source_items: Array<{
    id: number;
    title: string;
    type: 'movie' | 'tv';
    poster_path: string | null;
    year: number;
  }>;
  results: BlendResultItem[];
  provider: 'tastedive' | 'gemini';
}

interface BlendError {
  error: string;
  code: string;
  details?: string;
}

// ==========================================================================
// Constants
// ==========================================================================

const MIN_TITLES = 2;
const MAX_TITLES = 3;

const EXAMPLE_BLENDS = [
  {
    titles: ['Breaking Bad', 'Death Note'],
    description: 'Cat-and-mouse thriller with moral descent',
  },
  {
    titles: ['Inception', 'The Matrix'],
    description: 'Mind-bending sci-fi with reality questions',
  },
  {
    titles: ['The Office', 'Parks and Recreation'],
    description: 'Workplace mockumentary comedy',
  },
];

// ==========================================================================
// Blend Page Component
// ==========================================================================

export default function BlendPage() {
  // Selected titles state
  const [selectedTitles, setSelectedTitles] = useState<SelectedTitle[]>([]);

  // Results state
  const [results, setResults] = useState<BlendResultItem[]>([]);
  const [provider, setProvider] = useState<'tastedive' | 'gemini' | undefined>();

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Watchlist integration
  const { toggleItem } = useWatchlist();
  const watchlistIdArray = useWatchlistIdArray();
  const watchlistIds = useMemo(() => new Set(watchlistIdArray), [watchlistIdArray]);

  // ==========================================================================
  // Handlers
  // ==========================================================================

  const handleAddTitle = useCallback((title: SelectedTitle) => {
    setSelectedTitles((prev) => {
      // Don't add if already at max
      if (prev.length >= MAX_TITLES) return prev;
      // Don't add duplicates
      if (prev.some((t) => t.id === title.id)) return prev;
      return [...prev, title];
    });
    // Clear results when titles change
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  const handleRemoveTitle = useCallback((id: number) => {
    setSelectedTitles((prev) => prev.filter((t) => t.id !== id));
    // Clear results when titles change
    setResults([]);
    setHasSearched(false);
    setError(null);
  }, []);

  const handleBlend = useCallback(async () => {
    if (selectedTitles.length < MIN_TITLES) {
      setError(`Please select at least ${MIN_TITLES} titles to blend`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch('/api/blend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: selectedTitles.map((t) => ({
            id: t.id,
            type: t.type,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as BlendError;
        throw new Error(errorData.error || 'Failed to blend titles');
      }

      const successData = data as BlendResponse;
      setResults(successData.results);
      setProvider(successData.provider);
    } catch (err) {
      console.error('Blend error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedTitles]);

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

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  const canBlend = selectedTitles.length >= MIN_TITLES;
  const showResults = hasSearched && (results.length > 0 || isLoading);
  const excludeIds = selectedTitles.map((t) => t.id);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Hero Section */}
      <section className={`relative overflow-hidden transition-all duration-500 ${showResults ? 'pb-8 pt-6' : 'py-16 sm:py-20 lg:py-24'}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent" />

        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl animate-pulse" />
          <div className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          {/* Header - Hide when results shown */}
          {!showResults && (
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-4 py-2 backdrop-blur-sm">
                <Blend className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-400">
                  Content Blender
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
                Blend Your Favorites
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary sm:mt-4 sm:text-base md:text-lg">
                Select 2-3 titles you love, and we&apos;ll find content that combines their best elements.
              </p>
            </div>
          )}

          {/* Blend Card */}
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary/80 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6">
            {/* Selected Titles */}
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-text-secondary">
                  Selected Titles ({selectedTitles.length}/{MAX_TITLES})
                </h2>
                {selectedTitles.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedTitles([]);
                      setResults([]);
                      setHasSearched(false);
                    }}
                    className="text-xs text-text-tertiary hover:text-text-primary transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <SelectedTitles
                titles={selectedTitles}
                onRemove={handleRemoveTitle}
                maxTitles={MAX_TITLES}
              />
            </div>

            {/* Search Input */}
            {selectedTitles.length < MAX_TITLES && (
              <div className="mb-6">
                <TitleSearch
                  onSelect={handleAddTitle}
                  excludeIds={excludeIds}
                  placeholder={
                    selectedTitles.length === 0
                      ? 'Search for the first title...'
                      : selectedTitles.length === 1
                        ? 'Add a second title to blend...'
                        : 'Add an optional third title...'
                  }
                />
              </div>
            )}

            {/* Blend Button */}
            <button
              onClick={handleBlend}
              disabled={!canBlend || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3.5 font-medium text-white transition-all duration-200 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-purple-600 disabled:hover:to-blue-600"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span>Blending...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>Blend Titles</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Example Blends - Show when no titles selected */}
          {!showResults && selectedTitles.length === 0 && (
            <div className="mt-8">
              <p className="mb-4 text-center text-sm text-text-tertiary">
                Try blending titles like:
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {EXAMPLE_BLENDS.map((example, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border-subtle bg-bg-secondary/50 px-3 py-2 text-center"
                  >
                    <p className="text-sm font-medium text-text-primary">
                      {example.titles.join(' + ')}
                    </p>
                    <p className="mt-0.5 text-xs text-text-tertiary">
                      {example.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-400">Something went wrong</p>
              <p className="mt-0.5 text-sm text-text-secondary">{error}</p>
            </div>
          </div>
        )}

        {/* Results or empty state */}
        {isLoading ? (
          <BlendResults results={[]} isLoading={true} />
        ) : results.length > 0 ? (
          <BlendResults
            results={results}
            provider={provider}
            watchlistIds={watchlistIds}
            onWatchlistToggle={handleWatchlistToggle}
          />
        ) : (
          <BlendEmptyState hasSearched={hasSearched && !error} />
        )}
      </section>
    </main>
  );
}
