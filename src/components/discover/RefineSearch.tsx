'use client';

import { useState } from 'react';
import { RefreshCw, Plus, Minus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================================================
// Refine Search Component
// Quick refinement options after initial search
// ==========================================================================

interface RefineSearchProps {
  currentPrompt: string;
  onRefine: (refinedPrompt: string) => void;
  disabled?: boolean;
  className?: string;
}

const REFINEMENT_OPTIONS = [
  { label: 'More recent', modifier: 'but only from the last 3 years' },
  { label: 'Higher rated', modifier: 'with excellent ratings (8+)' },
  { label: 'Hidden gems', modifier: 'that are underrated or lesser known' },
  { label: 'Longer runtime', modifier: 'with longer runtime for a movie marathon' },
  { label: 'Shorter', modifier: 'but shorter and easy to watch' },
  { label: 'More intense', modifier: 'but more intense and gripping' },
  { label: 'Lighter tone', modifier: 'but lighter and more fun' },
  { label: 'Award winners', modifier: 'that have won major awards' },
];

export function RefineSearch({
  currentPrompt,
  onRefine,
  disabled = false,
  className = '',
}: RefineSearchProps) {
  const [customRefinement, setCustomRefinement] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleQuickRefine = (modifier: string) => {
    if (disabled) return;
    const refinedPrompt = `${currentPrompt}, ${modifier}`;
    onRefine(refinedPrompt);
  };

  const handleCustomRefine = () => {
    if (disabled || !customRefinement.trim()) return;
    const refinedPrompt = `${currentPrompt}, ${customRefinement.trim()}`;
    onRefine(refinedPrompt);
    setCustomRefinement('');
    setShowCustom(false);
  };

  return (
    <div className={cn('rounded-xl border border-border-subtle bg-bg-secondary/50 p-4', className)}>
      <div className="flex items-center gap-2 mb-3">
        <RefreshCw className="h-4 w-4 text-accent-primary" />
        <span className="text-sm font-medium text-text-primary">Refine your search</span>
      </div>

      {/* Quick refinement pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {REFINEMENT_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleQuickRefine(option.modifier)}
            disabled={disabled}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
              'bg-bg-tertiary text-text-secondary',
              'hover:bg-accent-primary/10 hover:text-accent-primary',
              'border border-transparent hover:border-accent-primary/20',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom refinement */}
      {showCustom ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customRefinement}
            onChange={(e) => setCustomRefinement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomRefine()}
            placeholder="Add your own refinement..."
            disabled={disabled}
            className={cn(
              'flex-1 rounded-lg border border-border-default bg-bg-primary px-3 py-2',
              'text-sm text-text-primary placeholder:text-text-tertiary',
              'focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          <button
            type="button"
            onClick={handleCustomRefine}
            disabled={disabled || !customRefinement.trim()}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              'bg-accent-primary text-white hover:bg-accent-hover',
              'disabled:bg-bg-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed'
            )}
          >
            <Sparkles className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowCustom(false)}
            className="rounded-lg px-3 py-2 text-sm text-text-tertiary hover:text-text-primary transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1.5 text-xs text-text-tertiary hover:text-accent-primary transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add custom refinement</span>
        </button>
      )}
    </div>
  );
}

export default RefineSearch;
