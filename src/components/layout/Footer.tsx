// ==========================================================================
// Footer Component
// Site footer with TMDB attribution and links
// ==========================================================================

import Link from 'next/link';
import { Github, Heart } from 'lucide-react';

// ==========================================================================
// Footer Links
// ==========================================================================

const FOOTER_SECTIONS = [
  {
    title: 'Browse',
    links: [
      { href: '/movies', label: 'Movies' },
      { href: '/tv', label: 'TV Shows' },
      { href: '/animation', label: 'Animation' },
      { href: '/anime', label: 'Anime' },
    ],
  },
  {
    title: 'Discover',
    links: [
      { href: '/discover', label: 'AI Discovery' },
      { href: '/blend', label: 'Content Blend' },
      { href: '/new/movies', label: 'New Releases' },
      { href: '/calendar', label: 'Calendar' },
    ],
  },
  {
    title: 'Categories',
    links: [
      { href: '/category/trending', label: 'Trending' },
      { href: '/category/top-rated', label: 'Top Rated' },
      { href: '/category/hidden-gems', label: 'Hidden Gems' },
      { href: '/category/classics', label: 'Classics' },
    ],
  },
] as const;

// ==========================================================================
// Footer Component
// ==========================================================================

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border-subtle bg-bg-secondary">
      <div className="container py-12">
        {/* Main Footer Content */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link
              href="/"
              className="inline-block text-xl font-bold text-text-primary"
            >
              Flick<span className="text-gradient">Pick</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm text-text-secondary">
              Discover your next favorite movie or TV show with AI-powered
              recommendations, mood-based discovery, and streaming availability.
            </p>

            {/* Social Links */}
            <div className="mt-6 flex gap-4">
              <a
                href="https://github.com/ngenohkevin"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary transition-colors hover:text-text-primary"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Link Sections */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold text-text-primary">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-text-secondary transition-colors hover:text-accent-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border-subtle pt-8 text-center md:flex-row md:text-left">
          {/* TMDB Attribution */}
          <div className="flex items-center gap-4">
            <p className="text-xs text-text-tertiary">
              This product uses the TMDB API but is not endorsed or certified by
              TMDB.
            </p>
          </div>

          {/* Built by */}
          <p className="flex items-center gap-1 text-xs text-text-tertiary">
            Built with <Heart className="h-3 w-3 fill-red-500 text-red-500" /> by{' '}
            <a
              href="https://github.com/ngenohkevin"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-text-secondary hover:text-accent-primary"
            >
              Kevin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
