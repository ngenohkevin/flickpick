'use client';

// ==========================================================================
// Display Ad Slot Component
// Generic ad slot for content grids and page sections
// ==========================================================================

import { cn } from '@/lib/utils';
import { shouldShowDisplayAds, AD_PROVIDER } from '@/lib/ads/config';
import { MonetAgBanner, type MonetAgBannerType } from './MonetAgBanner';

// ==========================================================================
// Types
// ==========================================================================

export type DisplayAdPlacement = 'content_grid' | 'sidebar' | 'search_results' | 'inline';

interface DisplayAdSlotProps {
  /** Where the ad is being placed */
  placement: DisplayAdPlacement;
  /** Additional class names */
  className?: string;
  /** Index in a list (for analytics) */
  index?: number;
}

// ==========================================================================
// Placement to Ad Type Mapping
// ==========================================================================

function getMonetAgTypeForPlacement(placement: DisplayAdPlacement): MonetAgBannerType {
  switch (placement) {
    case 'content_grid':
      return 'native';
    case 'sidebar':
      return 'vignette';
    case 'search_results':
      return 'native';
    case 'inline':
      return 'inPagePush';
    default:
      return 'native';
  }
}

// ==========================================================================
// Display Ad Slot Component
// ==========================================================================

/**
 * DisplayAdSlot
 *
 * A generic ad slot component that automatically selects the appropriate
 * ad format based on the placement. Works with the configured ad provider.
 *
 * Usage in content grids:
 * ```tsx
 * {items.map((item, index) => (
 *   <Fragment key={item.id}>
 *     <ContentCard content={item} />
 *     {(index + 1) % 12 === 0 && (
 *       <DisplayAdSlot placement="content_grid" index={index} />
 *     )}
 *   </Fragment>
 * ))}
 * ```
 *
 * @example
 * // In a sidebar
 * <DisplayAdSlot placement="sidebar" className="sticky top-4" />
 *
 * // In content grid
 * <DisplayAdSlot placement="content_grid" className="col-span-2" />
 */
export function DisplayAdSlot({ placement, className, index }: DisplayAdSlotProps) {
  // Check if display ads should be shown
  if (!shouldShowDisplayAds()) {
    return null;
  }

  // Render based on provider
  if (AD_PROVIDER === 'monetag') {
    const adType = getMonetAgTypeForPlacement(placement);

    return (
      <div
        className={cn(
          'display-ad-slot',
          // Default styling based on placement
          placement === 'content_grid' && 'col-span-2 row-span-1',
          placement === 'sidebar' && 'w-full',
          placement === 'search_results' && 'col-span-full',
          placement === 'inline' && 'my-4 w-full',
          className
        )}
        data-placement={placement}
        data-index={index}
      >
        <MonetAgBanner type={adType} />
      </div>
    );
  }

  // Placeholder provider (for development)
  if (AD_PROVIDER === 'placeholder') {
    return (
      <div
        className={cn(
          'display-ad-slot flex items-center justify-center rounded-lg border border-dashed border-purple-500/30 bg-purple-500/5 p-4',
          placement === 'content_grid' && 'col-span-2 row-span-1 min-h-[200px]',
          placement === 'sidebar' && 'min-h-[250px] w-full',
          placement === 'search_results' && 'col-span-full min-h-[90px]',
          placement === 'inline' && 'my-4 min-h-[90px] w-full',
          className
        )}
        data-placement={placement}
        data-index={index}
      >
        <div className="text-center">
          <div className="mb-2 text-2xl">📢</div>
          <p className="text-sm font-medium text-purple-400">Ad Placeholder</p>
          <p className="text-xs text-purple-400/60">{placement}</p>
        </div>
      </div>
    );
  }

  // Unknown provider
  return null;
}

export default DisplayAdSlot;
