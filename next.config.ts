import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
    ],
    // Cache optimized images for longer (1 week)
    minimumCacheTTL: 604800,
    // Increase timeout for fetching external images
    dangerouslyAllowSVG: false,
    // Use larger device sizes for movie posters
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        // Pages and their RSC payloads: browsers must check back every time.
        // Next's ISR header (s-maxage=3600, stale-while-revalidate=~1 year)
        // is meant for CDNs, but browsers apply the stale-while-revalidate
        // too and kept showing a homepage from days earlier, whose
        // relative dates then failed hydration. Next only writes its own
        // Cache-Control when none is set, so this one wins; ISR on the
        // server is unchanged. The old domain's 301 keeps its default.
        source: '/:path((?!_next/|api/|.*\\.\\w+$).*)',
        missing: [{ type: 'host', value: '(www\\.)?flickpick\\.site' }],
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
      {
        // Browsers and Cloudflare must revalidate the service worker, or a
        // fixed sw.js reaches installed users hours late
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ];
  },

  // Experimental features for performance
  experimental: {
    // Enable optimized package imports for smaller bundles
    optimizePackageImports: ['lucide-react'],
  },
};

export default withBundleAnalyzer(nextConfig);
