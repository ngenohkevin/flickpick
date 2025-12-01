'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ContentRow } from '@/components/content';
import { SkeletonRow } from '@/components/ui';
import { STREAMING_PROVIDERS } from '@/lib/constants';
import type { Content } from '@/types';

// ==========================================================================
// Streaming Tabs Component
// Tabbed interface showing popular content by streaming provider
// ==========================================================================

// Provider subset for homepage tabs
const HOMEPAGE_PROVIDERS = [
  STREAMING_PROVIDERS[0], // Netflix
  STREAMING_PROVIDERS[1], // Amazon Prime
  STREAMING_PROVIDERS[2], // Disney+
  STREAMING_PROVIDERS[3], // Max
  STREAMING_PROVIDERS[4], // Hulu
  STREAMING_PROVIDERS[7], // Apple TV+
].filter(Boolean) as typeof STREAMING_PROVIDERS;

interface StreamingTabsProps {
  className?: string;
}

export function StreamingTabs({ className }: StreamingTabsProps) {
  const [activeProvider, setActiveProvider] = useState(HOMEPAGE_PROVIDERS[0]!);
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContent = useCallback(async (providerId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/browse/movies?provider=${providerId}&watch_region=US&sort_by=popularity&page=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      setContent(data.results?.slice(0, 12) ?? []);
    } catch (err) {
      console.error('Error fetching streaming content:', err);
      setError('Failed to load content');
      setContent([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch content when provider changes
  useEffect(() => {
    fetchContent(activeProvider.id);
  }, [activeProvider, fetchContent]);

  return (
    <section className={className}>
      {/* Header */}
      <h2 className="mb-4 text-xl font-semibold text-text-primary sm:mb-6 sm:text-2xl">
        Popular on Streaming
      </h2>

      {/* Provider Tabs */}
      <div className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {HOMEPAGE_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setActiveProvider(provider)}
            className={cn(
              'flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
              activeProvider.id === provider.id
                ? 'bg-accent-primary text-white shadow-md'
                : 'bg-bg-secondary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-border-subtle'
            )}
          >
            <div className="relative h-5 w-5 overflow-hidden rounded">
              <Image
                src={`https://image.tmdb.org/t/p/original${provider.logo}`}
                alt={provider.name}
                fill
                className="object-cover"
                sizes="20px"
              />
            </div>
            <span className="hidden sm:inline">{provider.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {error ? (
        <div className="rounded-lg bg-bg-secondary p-8 text-center">
          <p className="text-text-secondary">{error}</p>
          <button
            onClick={() => fetchContent(activeProvider.id)}
            className="mt-4 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Try Again
          </button>
        </div>
      ) : isLoading ? (
        <SkeletonRow count={6} />
      ) : content.length > 0 ? (
        <ContentRow
          title=""
          items={content}
          showViewAll={false}
          showTypeBadge={true}
        />
      ) : (
        <div className="rounded-lg bg-bg-secondary p-8 text-center">
          <p className="text-text-secondary">No content available for {activeProvider.name}</p>
        </div>
      )}
    </section>
  );
}

// ==========================================================================
// Server-side Streaming Preview (for initial load)
// ==========================================================================

interface StreamingPreviewProps {
  initialProvider: string;
  initialContent: Content[];
  className?: string;
}

export function StreamingPreview({
  initialProvider,
  initialContent,
  className,
}: StreamingPreviewProps) {
  return (
    <section className={className}>
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Popular on {initialProvider}
        </h2>
      </div>
      <ContentRow
        title=""
        items={initialContent}
        showViewAll={false}
        showTypeBadge={true}
      />
    </section>
  );
}
