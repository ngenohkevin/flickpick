'use client';

// ==========================================================================
// Streaming Badges Component
// Compact display of streaming provider logos for content cards
// ==========================================================================

import Image from 'next/image';
import type { ProvidersByCountry } from '@/types';
import { usePreferences } from '@/stores/preferences';

// ==========================================================================
// Types
// ==========================================================================

interface StreamingBadgesProps {
  providers: ProvidersByCountry;
  maxDisplay?: number;
  className?: string;
}

// ==========================================================================
// Constants
// ==========================================================================

const PROVIDER_IMAGE_BASE = 'https://image.tmdb.org/t/p/w45';

// ==========================================================================
// Streaming Badges Component
// ==========================================================================

export function StreamingBadges({
  providers,
  maxDisplay = 4,
  className = '',
}: StreamingBadgesProps) {
  const country = usePreferences((state) => state.country);
  const countryProviders = providers[country];

  // Get all streaming providers (prioritize flatrate/subscription)
  const allProviders = [
    ...(countryProviders?.flatrate ?? []),
    ...(countryProviders?.ads ?? []),
  ];

  // Remove duplicates and sort by priority
  const uniqueProviders = allProviders
    .filter((p, i, arr) => arr.findIndex((x) => x.provider_id === p.provider_id) === i)
    .sort((a, b) => a.display_priority - b.display_priority)
    .slice(0, maxDisplay);

  if (uniqueProviders.length === 0) {
    return null;
  }

  const remainingCount = allProviders.length - maxDisplay;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {uniqueProviders.map((provider) => (
        <div
          key={provider.provider_id}
          className="relative h-6 w-6 overflow-hidden rounded"
          title={provider.provider_name}
        >
          <Image
            src={`${PROVIDER_IMAGE_BASE}${provider.logo_path}`}
            alt={provider.provider_name}
            fill
            className="object-cover"
            sizes="24px"
          />
        </div>
      ))}
      {remainingCount > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded bg-bg-tertiary text-[10px] font-medium text-text-tertiary">
          +{remainingCount}
        </span>
      )}
    </div>
  );
}
