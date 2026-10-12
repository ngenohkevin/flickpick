'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ContentRow } from '@/components/content';
import { SkeletonRow } from '@/components/ui';
import { findStreamingProvider, type StreamingProvider } from '@/lib/constants';
import { useRegionProviders } from '@/lib/hooks/useRegionProviders';
import type { Content } from '@/types';

// ==========================================================================
// Streaming Tabs Component
// Tabbed interface showing popular content by streaming provider
// ==========================================================================

// Netflix, Prime Video, Disney+, HBO Max, Hulu, Apple TV
const HOMEPAGE_PROVIDERS = [8, 9, 337, 1899, 15, 350]
  .map((id) => findStreamingProvider(id))
  .filter((p): p is StreamingProvider => p !== undefined);

interface StreamingTabsProps {
  className?: string;
}

export function StreamingTabs({ className }: StreamingTabsProps) {
  const [selectedProvider, setSelectedProvider] = useState(HOMEPAGE_PROVIDERS[0]!);
  // Tabs for the services offered in the viewer's streaming country (all
  // of them until that is known), and rows for that country's catalogue
  const { region, ids: regionIds } = useRegionProviders();
  const tabs = regionIds ? HOMEPAGE_PROVIDERS.filter((p) => regionIds.has(p.id)) : HOMEPAGE_PROVIDERS;
  const activeProvider = tabs.find((p) => p.id === selectedProvider.id) ?? tabs[0];
  const [content, setContent] = useState<Content[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clicking tabs quickly must not let an older provider's response land last
  const requestIdRef = useRef(0);

  const fetchContent = useCallback(async (providerId: number, watchRegion: string) => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/browse/movies?provider=${providerId}&watch_region=${watchRegion}&sort_by=popularity&page=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch content');
      }

      const data = await response.json();
      if (requestId !== requestIdRef.current) return;
      setContent(data.results?.slice(0, 12) ?? []);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error fetching streaming content:', err);
      setError('Failed to load content');
      setContent([]);
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  }, []);

  // Fetch content when the provider or country changes
  const activeId = activeProvider?.id;
  useEffect(() => {
    if (activeId !== undefined) fetchContent(activeId, region);
  }, [activeId, region, fetchContent]);

  // None of these services operate in the viewer's country
  if (!activeProvider) return null;

  return (
    <section className={className}>
      {/* Header */}
      <h2 className="mb-4 text-xl font-semibold text-text-primary sm:mb-6 sm:text-2xl">
        Popular on Streaming
      </h2>

      {/* Provider Tabs */}
      <div className="scrollbar-hide -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {tabs.map((provider) => (
          <button
            key={provider.id}
            onClick={() => setSelectedProvider(provider)}
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
            onClick={() => fetchContent(activeProvider.id, region)}
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
