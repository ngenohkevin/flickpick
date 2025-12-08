'use client';

// ==========================================================================
// Header Component
// Main navigation header with logo, nav links, search, and theme toggle
// Auto-hides on scroll down on mobile for better content viewing
// ==========================================================================

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Sun, Moon, Menu, X, Film, Tv, Sparkles, Heart, CalendarDays, Blend } from 'lucide-react';
import { usePreferences } from '@/stores/preferences';
import { MobileNav } from './MobileNav';
import { SearchBar, SearchOverlay } from '@/components/search';
import { cn } from '@/lib/utils';

// ==========================================================================
// Navigation Links
// ==========================================================================

const NAV_LINKS = [
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/tv', label: 'TV Shows', icon: Tv },
  { href: '/anime', label: 'Anime', icon: Sparkles },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
] as const;

// ==========================================================================
// Header Component
// ==========================================================================

export function Header() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { theme, setTheme } = usePreferences();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // Handle scroll to hide/show header on mobile
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    const scrollThreshold = 50; // Minimum scroll before hiding

    // Don't hide if mobile nav or search is open
    if (mobileNavOpen || searchOpen) {
      setIsHidden(false);
      setLastScrollY(currentScrollY);
      return;
    }

    // Don't hide at the top of the page
    if (currentScrollY < scrollThreshold) {
      setIsHidden(false);
      setLastScrollY(currentScrollY);
      return;
    }

    // Hide when scrolling down, show when scrolling up
    if (currentScrollY > lastScrollY && currentScrollY > scrollThreshold) {
      setIsHidden(true);
    } else if (currentScrollY < lastScrollY) {
      setIsHidden(false);
    }

    setLastScrollY(currentScrollY);
  }, [lastScrollY, mobileNavOpen, searchOpen]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/80 backdrop-blur-lg transition-transform duration-300',
          // Hide header when scrolling down
          isHidden && '-translate-y-full'
        )}
      >
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
            {/* Content Blender - Highlighted */}
            <Link
              href="/blend"
              className="ml-1 flex items-center gap-1.5 rounded-full bg-purple-500/15 px-4 py-2 font-medium text-purple-400 transition-colors hover:bg-purple-500/25"
            >
              <Blend className="h-4 w-4" />
              Blend
            </Link>
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
