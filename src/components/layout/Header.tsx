'use client';

// ==========================================================================
// Header Component
// Main navigation header with logo, nav links, search, and theme toggle
// ==========================================================================

import { useState } from 'react';
import Link from 'next/link';
import { Search, Sun, Moon, Menu, X, Film, Tv, Sparkles, Heart } from 'lucide-react';
import { usePreferences } from '@/stores/preferences';
import { MobileNav } from './MobileNav';
import { SearchBar, SearchOverlay } from '@/components/search';

// ==========================================================================
// Navigation Links
// ==========================================================================

const NAV_LINKS = [
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/tv', label: 'TV Shows', icon: Tv },
  { href: '/anime', label: 'Anime', icon: Sparkles },
  { href: '/discover', label: 'Discover', icon: Sparkles },
] as const;

// ==========================================================================
// Header Component
// ==========================================================================

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, setTheme } = usePreferences();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-lg">
        <nav className="container flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex flex-shrink-0 items-center gap-2 text-xl font-bold text-text-primary transition-opacity hover:opacity-80"
          >
            <span>
              Flick<span className="text-gradient">Pick</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-4 py-2 font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden max-w-md flex-1 md:block lg:max-w-lg">
            <SearchBar placeholder="Search movies, shows, anime..." />
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary md:hidden"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Watchlist Button */}
            <Link
              href="/watchlist"
              className="hidden rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary sm:block"
              aria-label="Watchlist"
            >
              <Heart className="h-5 w-5" />
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="rounded-full p-2 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary lg:hidden"
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Navigation */}
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* Mobile Search Overlay */}
      <SearchOverlay isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
