'use client';

import { cn } from '@/lib/utils';
import { EXAMPLE_PROMPTS } from '@/lib/ai/types';

// ==========================================================================
// Example Prompts Component
// Clickable suggestion pills for quick discovery
// ==========================================================================

interface ExamplePromptsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

// Curated short prompts for better UI
const QUICK_PROMPTS = [
  'Cozy anime for a rainy day',
  'Mind-bending thriller',
  'Feel-good comedy',
  'Epic fantasy adventure',
  'Dark crime drama',
  'Sci-fi with deep themes',
  '90s nostalgia vibes',
  'Emotional tearjerker',
  'Hidden gem horror',
  'Heartwarming animation',
];

export function ExamplePrompts({
  onSelect,
  disabled = false,
  className = '',
}: ExamplePromptsProps) {
  return (
    <div className={cn('w-full', className)}>
      <p className="mb-3 text-center text-xs font-medium text-text-tertiary">
        Try something like
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => !disabled && onSelect(prompt)}
            disabled={disabled}
            className={cn(
              'rounded-full bg-bg-tertiary/50 px-3 py-1.5',
              'text-xs text-text-secondary',
              'border border-transparent',
              'transition-all duration-200',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-bg-tertiary hover:text-text-primary hover:border-border-subtle',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary'
            )}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ExamplePrompts;
