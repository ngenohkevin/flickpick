'use client';

// ==========================================================================
// Provider Filter Component
// Multi-select filter for streaming services
// ==========================================================================

import { useState } from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface StreamingProvider {
  id: number;
  name: string;
  logo: string;
}

interface ProviderFilterProps {
  selectedProviders: number[];
  onSelectionChange: (providers: number[]) => void;
  className?: string;
}

// ==========================================================================
// Popular Streaming Providers
// Provider IDs from TMDB watch providers API
// ==========================================================================

const POPULAR_PROVIDERS: StreamingProvider[] = [
  { id: 8, name: 'Netflix', logo: '/t2yyOv40HZeVlLjYsCsPHnWLk4W.jpg' },
  { id: 9, name: 'Prime Video', logo: '/emthp39XA2YScoYL1p0sdbAH2WA.jpg' },
  { id: 337, name: 'Disney+', logo: '/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg' },
  { id: 350, name: 'Apple TV+', logo: '/6uhKBfmtzFqOcLousHwZuzcrScK.jpg' },
  { id: 384, name: 'HBO Max', logo: '/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg' },
  { id: 15, name: 'Hulu', logo: '/zxrVdFjIjLqkfnwyghnfywTn3Lh.jpg' },
  { id: 531, name: 'Paramount+', logo: '/xbhHHa1YgtpwhC8lb1NQ3ACVcLd.jpg' },
  { id: 283, name: 'Crunchyroll', logo: '/8Gt1iClBlzTeQs8WQm8UrCoIxnQ.jpg' },
  { id: 386, name: 'Peacock', logo: '/8VCV78prwd9QzZnEm0ReO6bERDa.jpg' },
  { id: 1899, name: 'Max', logo: '/6Q3ZYUNA9Hsgj6iWnVsw2gR5V6z.jpg' },
];

const PROVIDER_IMAGE_BASE = 'https://image.tmdb.org/t/p/w45';

// ==========================================================================
// Provider Filter Component
// ==========================================================================

export function ProviderFilter({
  selectedProviders,
  onSelectionChange,
  className,
}: ProviderFilterProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedProviders = showAll ? POPULAR_PROVIDERS : POPULAR_PROVIDERS.slice(0, 6);

  const toggleProvider = (providerId: number) => {
    if (selectedProviders.includes(providerId)) {
      onSelectionChange(selectedProviders.filter((id) => id !== providerId));
    } else {
      onSelectionChange([...selectedProviders, providerId]);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">Streaming Services</h3>
        {selectedProviders.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-text-tertiary hover:text-text-secondary"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Provider Grid */}
      <div className="flex flex-wrap gap-2">
        {displayedProviders.map((provider) => {
          const isSelected = selectedProviders.includes(provider.id);
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => toggleProvider(provider.id)}
              className={cn(
                'relative flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10 text-text-primary'
                  : 'border-border-default bg-bg-secondary text-text-secondary hover:border-border-strong hover:bg-bg-tertiary'
              )}
              title={provider.name}
            >
              <div className="relative h-6 w-6 overflow-hidden rounded">
                <Image
                  src={`${PROVIDER_IMAGE_BASE}${provider.logo}`}
                  alt={provider.name}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
              <span className="text-sm font-medium">{provider.name}</span>
              {isSelected && (
                <Check className="h-4 w-4 text-accent-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Show More/Less */}
      {POPULAR_PROVIDERS.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-sm text-accent-primary hover:text-accent-hover"
        >
          {showAll ? 'Show less' : `Show ${POPULAR_PROVIDERS.length - 6} more`}
        </button>
      )}
    </div>
  );
}

// ==========================================================================
// Export Provider List
// ==========================================================================

export { POPULAR_PROVIDERS };
export type { StreamingProvider };
