// ==========================================================================
// 404 Not Found Page
// Displayed when a route doesn't exist
// ==========================================================================

import Link from 'next/link';
import { Home, Search, Film } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-24">
      <div className="text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center rounded-full bg-bg-secondary p-6">
            <Film className="h-16 w-16 text-text-tertiary" />
          </div>
        </div>

        {/* Error Code */}
        <p className="mb-2 text-6xl font-bold text-gradient">404</p>

        {/* Message */}
        <h1 className="mb-2 text-2xl font-bold text-text-primary">
          Page not found
        </h1>
        <p className="mb-8 max-w-md text-text-secondary">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-accent-hover hover:shadow-lg"
          >
            <Home className="h-5 w-5" />
            Go home
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-secondary px-6 py-3 font-semibold text-text-primary transition-all hover:bg-bg-tertiary hover:border-border-strong"
          >
            <Search className="h-5 w-5" />
            Discover movies
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12">
          <p className="mb-4 text-sm text-text-tertiary">Or try these pages:</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/movies"
              className="rounded-full bg-badge-movie/20 px-4 py-2 text-sm font-medium text-badge-movie transition-colors hover:bg-badge-movie/30"
            >
              Movies
            </Link>
            <Link
              href="/tv"
              className="rounded-full bg-badge-tv/20 px-4 py-2 text-sm font-medium text-badge-tv transition-colors hover:bg-badge-tv/30"
            >
              TV Shows
            </Link>
            <Link
              href="/anime"
              className="rounded-full bg-badge-anime/20 px-4 py-2 text-sm font-medium text-badge-anime transition-colors hover:bg-badge-anime/30"
            >
              Anime
            </Link>
            <Link
              href="/category/trending"
              className="rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
            >
              Trending
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
