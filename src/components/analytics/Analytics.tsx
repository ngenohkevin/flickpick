'use client';

import Script from 'next/script';

/**
 * Analytics component that loads the Umami tracking script
 * Only loads when environment variables are configured
 *
 * Required environment variables:
 * - NEXT_PUBLIC_UMAMI_WEBSITE_ID: Your Umami website ID
 * - NEXT_PUBLIC_UMAMI_URL: Your Umami instance URL
 *
 * @see https://umami.is/docs/tracker-configuration
 */
export function Analytics() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

  // Don't render anything if analytics is not configured
  if (!websiteId || !umamiUrl) {
    return null;
  }

  // Construct the script URL
  const scriptUrl = `${umamiUrl.replace(/\/$/, '')}/script.js`;

  return (
    <Script
      defer
      src={scriptUrl}
      data-website-id={websiteId}
      strategy="lazyOnload"
    />
  );
}
