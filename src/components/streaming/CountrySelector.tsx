'use client';

// ==========================================================================
// Country Selector Component
// Dropdown to select country for streaming availability
// ==========================================================================

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { usePreferences } from '@/stores/preferences';
import { cn } from '@/lib/utils';

// ==========================================================================
// Types
// ==========================================================================

interface CountrySelectorProps {
  className?: string;
  compact?: boolean;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

// ==========================================================================
// Supported Countries
// TMDB watch providers are available in these regions
// ==========================================================================

const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', name: 'Ireland', flag: '🇮🇪' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
];

// ==========================================================================
// Country Selector Component
// ==========================================================================

export function CountrySelector({ className, compact = false }: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const country = usePreferences((state) => state.country);
  const setCountry = usePreferences((state) => state.setCountry);

  // Default to US if country not found
  const defaultCountry: Country = { code: 'US', name: 'United States', flag: '🇺🇸' };
  const selectedCountry = SUPPORTED_COUNTRIES.find((c) => c.code === country) ?? defaultCountry;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleSelect = (countryCode: string) => {
    setCountry(countryCode);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary transition-colors hover:bg-bg-tertiary',
          compact ? 'px-2 py-1.5' : 'px-3 py-2'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className={cn('text-text-tertiary', compact ? 'h-4 w-4' : 'h-5 w-5')} />
        <span className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>
          {selectedCountry.flag} {compact ? selectedCountry.code : selectedCountry.name}
        </span>
        <ChevronDown
          className={cn(
            'text-text-tertiary transition-transform',
            compact ? 'h-3 w-3' : 'h-4 w-4',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-border-default bg-bg-elevated shadow-xl"
        >
          <div className="p-1">
            {SUPPORTED_COUNTRIES.map((c) => (
              <button
                key={c.code}
                role="option"
                aria-selected={c.code === country}
                onClick={() => handleSelect(c.code)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  c.code === country
                    ? 'bg-accent-primary/10 text-accent-primary'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                )}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1">{c.name}</span>
                {c.code === country && <Check className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================================================
// Export Countries List (for use elsewhere)
// ==========================================================================

export { SUPPORTED_COUNTRIES };
export type { Country };
