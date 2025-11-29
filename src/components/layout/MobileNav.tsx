'use client';

// ==========================================================================
// Mobile Navigation Component
// Slide-out navigation for mobile devices
// ==========================================================================

import { useEffect } from 'react';
import Link from 'next/link';
import { Film, Tv, Sparkles, Heart, Clapperboard, Calendar, TrendingUp } from 'lucide-react';

// ==========================================================================
// Navigation Items
// ==========================================================================

const MOBILE_NAV_SECTIONS = [
  {
    title: 'Browse',
    links: [
      { href: '/movies', label: 'Movies', icon: Film },
      { href: '/tv', label: 'TV Shows', icon: Tv },
      { href: '/animation', label: 'Animation', icon: Clapperboard },
      { href: '/anime', label: 'Anime', icon: Sparkles },
    ],
  },
  {
    title: 'Discover',
    links: [
      { href: '/discover', label: 'AI Discovery', icon: Sparkles },
      { href: '/trending', label: 'Trending', icon: TrendingUp },
      { href: '/new/movies', label: 'New Releases', icon: Calendar },
    ],
  },
  {
    title: 'My Stuff',
    links: [{ href: '/watchlist', label: 'Watchlist', icon: Heart }],
  },
] as const;

// ==========================================================================
// Props
// ==========================================================================

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

// ==========================================================================
// MobileNav Component
// ==========================================================================

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when nav is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Navigation Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-bg-secondary shadow-xl md:hidden">
        <nav className="flex h-full flex-col overflow-y-auto p-6 pt-20">
          {MOBILE_NAV_SECTIONS.map((section) => (
            <div key={section.title} className="mb-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                {section.title}
              </h3>
              <ul className="space-y-1">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}
