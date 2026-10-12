'use client';

// ==========================================================================
// Country Selector Component
// Dropdown to select country for streaming availability
// ==========================================================================

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Globe, Check } from 'lucide-react';
import { usePreferences } from '@/stores/preferences';
import { cn } from '@/lib/utils';
import { SUPPORTED_COUNTRIES, type Country } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

interface CountrySelectorProps {
  className?: string;
  compact?: boolean;
  /** Which edge of the button the menu lines up with (default: right) */
  align?: 'left' | 'right';
}

// ==========================================================================
// Country Selector Component
// ==========================================================================

export function CountrySelector({ className, compact = false, align = 'right' }: CountrySelectorProps) {
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
          className={cn(
            'absolute z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-lg border border-border-default bg-bg-elevated shadow-xl',
            align === 'left' ? 'left-0' : 'right-0'
          )}
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
