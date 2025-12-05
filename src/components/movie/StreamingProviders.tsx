'use client';

// ==========================================================================
// Streaming Providers Component
// Shows where to watch/rent/buy content with country selector
// ==========================================================================

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import { usePreferences } from '@/stores/preferences';
import { CountrySelector } from '@/components/streaming';
import { trackProviderClick } from '@/lib/analytics';
import type { ProvidersByCountry, Provider } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface StreamingProvidersProps {
  providers: ProvidersByCountry;
  title: string;
  contentId?: number;
  contentType?: 'movie' | 'tv';
  className?: string;
}

// ==========================================================================
// Provider Image Base URL
// ==========================================================================

const PROVIDER_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

// ==========================================================================
// Streaming Providers Component
// ==========================================================================

export function StreamingProviders({
  providers,
  title,
  contentId,
  contentType = 'movie',
  className = '',
}: StreamingProvidersProps) {
  const country = usePreferences((state) => state.country);
  const countryProviders = providers[country];

  if (!countryProviders) {
    return (
      <section className={className}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            Where to Watch
          </h2>
          <CountrySelector compact />
        </div>
        <p className="text-text-tertiary">
          Streaming information not available in your region.
        </p>
      </section>
    );
  }

  const { flatrate, rent, buy, ads, link } = countryProviders;
  const hasProviders = flatrate?.length || rent?.length || buy?.length || ads?.length;

  if (!hasProviders) {
    return (
      <section className={className}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
            Where to Watch
          </h2>
          <CountrySelector compact />
        </div>
        <p className="text-text-tertiary">
          No streaming options available at this time.
        </p>
      </section>
    );
  }

  return (
    <section className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">
          Where to Watch
        </h2>
        <div className="flex items-center gap-3">
          <CountrySelector compact />
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-accent-primary transition-colors hover:text-accent-hover"
            >
              View on JustWatch
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Stream */}
        {flatrate && flatrate.length > 0 && (
          <ProviderCategory
            title="Stream"
            providers={flatrate}
            link={link}
            movieTitle={title}
            contentId={contentId}
            contentType={contentType}
            watchType="stream"
          />
        )}

        {/* Free with Ads */}
        {ads && ads.length > 0 && (
          <ProviderCategory
            title="Free with Ads"
            providers={ads}
            link={link}
            movieTitle={title}
            contentId={contentId}
            contentType={contentType}
            watchType="stream"
          />
        )}

        {/* Rent */}
        {rent && rent.length > 0 && (
          <ProviderCategory
            title="Rent"
            providers={rent}
            link={link}
            movieTitle={title}
            contentId={contentId}
            contentType={contentType}
            watchType="rent"
          />
        )}

        {/* Buy */}
        {buy && buy.length > 0 && (
          <ProviderCategory
            title="Buy"
            providers={buy}
            link={link}
            movieTitle={title}
            contentId={contentId}
            contentType={contentType}
            watchType="buy"
          />
        )}
      </div>

      {/* TMDB Attribution */}
      <p className="mt-4 text-xs text-text-tertiary">
        Streaming data provided by JustWatch via TMDB.
      </p>
    </section>
  );
}

// ==========================================================================
// Provider Category Component
// ==========================================================================

interface ProviderCategoryProps {
  title: string;
  providers: Provider[];
  link?: string;
  movieTitle: string;
  contentId?: number;
  contentType: 'movie' | 'tv';
  watchType: 'stream' | 'rent' | 'buy';
}

function ProviderCategory({
  title,
  providers,
  link,
  movieTitle,
  contentId,
  contentType,
  watchType,
}: ProviderCategoryProps) {
  const handleProviderClick = (provider: Provider) => {
    if (contentId) {
      trackProviderClick(
        provider.provider_name,
        provider.provider_id,
        contentId,
        contentType,
        watchType
      );
    }
  };

  return (
    <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
      <h3 className="mb-3 text-sm font-medium text-text-tertiary">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {providers
          .sort((a, b) => a.display_priority - b.display_priority)
          .slice(0, 6)
          .map((provider) => (
            <a
              key={provider.provider_id}
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              title={`Watch ${movieTitle} on ${provider.provider_name}`}
              className="group relative"
              onClick={() => handleProviderClick(provider)}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-lg transition-transform group-hover:scale-105">
                <Image
                  src={`${PROVIDER_IMAGE_BASE}${provider.logo_path}`}
                  alt={provider.provider_name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
            </a>
          ))}
        {providers.length > 6 && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-bg-tertiary text-sm font-medium text-text-tertiary">
            +{providers.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}
