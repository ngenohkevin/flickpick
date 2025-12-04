'use client';

import { useState, useCallback, useMemo } from 'react';
import { AlertCircle, Wand2 } from 'lucide-react';
import {
  PromptInput,
  ContentTypeSelector,
  ExamplePrompts,
  DiscoverResults,
  DiscoverEmptyState,
  PromptHistory,
  RefineSearch,
  StreamingFilter,
} from '@/components/discover';
import { useWatchlist, useWatchlistIdArray } from '@/stores/watchlist';
import { usePromptHistory } from '@/stores/promptHistory';
import type { DiscoverResponse, DiscoverError, EnrichedRecommendation } from '@/lib/ai/types';
import type { ContentType, Content } from '@/types';

// ==========================================================================
// AI Discovery Page
// Natural language content discovery powered by AI
// ==========================================================================

export default function DiscoverPage() {
  // Form state
  const [prompt, setPrompt] = useState('');
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [lastSearchedPrompt, setLastSearchedPrompt] = useState('');

  // Streaming filter state
  const [streamingFilter, setStreamingFilter] = useState<number[]>([]);

  // Results state
  const [results, setResults] = useState<EnrichedRecommendation[]>([]);
  const [provider, setProvider] = useState<string | undefined>();
  const [isFallback, setIsFallback] = useState(false);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Watchlist integration
  const { toggleItem } = useWatchlist();
  const watchlistIdArray = useWatchlistIdArray();
  const watchlistIds = useMemo(() => new Set(watchlistIdArray), [watchlistIdArray]);

  // Prompt history
  const { addPrompt } = usePromptHistory();

  // Handle discovery request
  const handleDiscover = useCallback(async (searchPrompt?: string) => {
    const promptToUse = searchPrompt || prompt;
    if (promptToUse.trim().length < 3) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setLastSearchedPrompt(promptToUse.trim());

    // Update prompt input if using a different prompt (from refine)
    if (searchPrompt) {
      setPrompt(searchPrompt);
    }

    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptToUse.trim(),
          contentTypes: contentTypes.length > 0 ? contentTypes : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as DiscoverError;
        throw new Error(errorData.error || 'Failed to get recommendations');
      }

      const successData = data as DiscoverResponse;
      setResults(successData.results);
      setProvider(successData.provider);
      setIsFallback(successData.isFallback);

      // Add to history with result count
      addPrompt(promptToUse.trim(), successData.results.length);
    } catch (err) {
      console.error('Discovery error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, contentTypes, addPrompt]);

  // Handle example or history prompt selection
  const handlePromptSelect = useCallback((selectedPrompt: string) => {
    setPrompt(selectedPrompt);
  }, []);

  // Handle refine search
  const handleRefine = useCallback((refinedPrompt: string) => {
    handleDiscover(refinedPrompt);
  }, [handleDiscover]);

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

  const showResults = hasSearched && (results.length > 0 || isLoading);

  // Filter results by content type and streaming provider
  const filteredResults = useMemo(() => {
    let filtered = results;

    // Filter by content type (in case AI returned wrong types)
    if (contentTypes.length > 0) {
      filtered = filtered.filter((result) => contentTypes.includes(result.content_type));
    }

    // Filter by streaming provider (if provider data is available)
    if (streamingFilter.length > 0) {
      filtered = filtered.filter((result) => {
        // Check if result has provider data and matches selected providers
        if (!result.providers || result.providers.length === 0) {
          return false; // Exclude results without provider data when filter is active
        }
        return result.providers.some((p) => streamingFilter.includes(p));
      });
    }

    return filtered;
  }, [results, contentTypes, streamingFilter]);

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* Hero Section - Compact when results shown */}
      <section className={`relative overflow-hidden transition-all duration-500 ${showResults ? 'pb-8 pt-6' : 'py-16 sm:py-20 lg:py-24'}`}>
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent-primary/5 via-transparent to-transparent" />

        {/* Animated background orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 top-0 h-64 w-64 rounded-full bg-accent-primary/10 blur-3xl animate-pulse" />
          <div className="absolute -right-32 top-20 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          {/* Header - Hide when results shown */}
          {!showResults && (
            <div className="mb-10 text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent-primary/20 bg-accent-primary/5 px-4 py-2 backdrop-blur-sm">
                <Wand2 className="h-4 w-4 text-accent-primary" />
                <span className="text-sm font-medium text-accent-primary">
                  AI-Powered Discovery
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
                What do you want to watch?
              </h1>

              <p className="mx-auto mt-3 max-w-xl text-sm text-text-secondary sm:mt-4 sm:text-base md:text-lg">
                Describe your mood or what you&apos;re looking for, and let AI find the perfect match.
              </p>
            </div>
          )}

          {/* Search Card */}
          <div className={`rounded-2xl border border-border-subtle bg-bg-secondary/80 p-4 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-6 ${showResults ? '' : ''}`}>
            {/* Content type pills */}
            <ContentTypeSelector
              selected={contentTypes}
              onChange={setContentTypes}
              disabled={isLoading}
              className="mb-4"
            />

            {/* Prompt input */}
            <PromptInput
              value={prompt}
              onChange={setPrompt}
              onSubmit={() => handleDiscover()}
              isLoading={isLoading}
              placeholder="A cozy anime for a rainy night, mind-bending sci-fi like Inception..."
            />
          </div>

          {/* Example prompts and history - Hide when results shown */}
          {!showResults && (
            <div className="mt-6 space-y-6">
              <PromptHistory onSelect={handlePromptSelect} disabled={isLoading} />
              <ExamplePrompts onSelect={handlePromptSelect} disabled={isLoading} />
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

        {/* Refine search and filters - Show when we have results */}
        {showResults && results.length > 0 && !isLoading && (
          <div className="mb-6 space-y-4">
            <RefineSearch
              currentPrompt={lastSearchedPrompt}
              onRefine={handleRefine}
              disabled={isLoading}
            />
            <StreamingFilter
              selected={streamingFilter}
              onChange={setStreamingFilter}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Results or empty state */}
        {isLoading ? (
          <DiscoverResults results={[]} isLoading={true} />
        ) : filteredResults.length > 0 ? (
          <DiscoverResults
            results={filteredResults}
            provider={provider}
            isFallback={isFallback}
            watchlistIds={watchlistIds}
            onWatchlistToggle={handleWatchlistToggle}
          />
        ) : (
          <DiscoverEmptyState hasSearched={hasSearched && !error} />
        )}
      </section>
    </main>
  );
}
