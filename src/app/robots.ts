import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// ==========================================================================
// Robots.txt Configuration
// Controls search engine crawler behavior
// ==========================================================================

const BASE_URL = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // Block API routes
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
