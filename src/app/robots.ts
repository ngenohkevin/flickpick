import { MetadataRoute } from 'next';

// ==========================================================================
// Robots.txt Configuration
// Controls search engine crawler behavior
// ==========================================================================

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Block API routes
          '/_next/',         // Block Next.js internal routes
          '/private/',       // Block any private routes
        ],
      },
      {
        // Specific rules for GPTBot (OpenAI)
        userAgent: 'GPTBot',
        disallow: ['/'],
      },
      {
        // Specific rules for CCBot (Common Crawl)
        userAgent: 'CCBot',
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
