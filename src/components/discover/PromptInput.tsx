'use client';

import { useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==========================================================================
// Prompt Input Component
// Clean textarea for natural language discovery prompts
// ==========================================================================

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  disabled = false,
  placeholder = "Describe what you're in the mood for...",
  maxLength = 500,
  className = '',
}: PromptInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (value.trim().length >= 3 && !isLoading && !disabled) {
          onSubmit();
        }
      }
    },
    [value, isLoading, disabled, onSubmit]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      if (newValue.length <= maxLength) {
        onChange(newValue);
      }
    },
    [onChange, maxLength]
  );

  const canSubmit = value.trim().length >= 3 && !isLoading && !disabled;

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'relative rounded-xl border transition-all duration-200',
          isFocused
            ? 'border-accent-primary/50 bg-bg-primary ring-1 ring-accent-primary/20'
            : 'border-border-default bg-bg-primary/50 hover:border-border-strong',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Search icon */}
        <div className="absolute left-3 top-3 sm:left-4 sm:top-4 text-text-tertiary">
          <Search className="h-5 w-5" />
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={3}
          className={cn(
            'w-full resize-none bg-transparent',
            'pl-10 pr-4 pt-3 pb-16 sm:pl-12 sm:pr-4 sm:pt-4 sm:pb-16',
            'text-sm sm:text-base text-text-primary placeholder:text-text-tertiary',
            'focus:outline-none',
            'disabled:cursor-not-allowed'
          )}
          aria-label="Describe what you're looking for"
        />

        {/* Submit button - positioned at bottom right */}
        <div className="absolute right-3 bottom-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
              canSubmit
                ? 'bg-accent-primary text-white hover:bg-accent-hover shadow-lg shadow-accent-primary/25'
                : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'
            )}
            aria-label="Discover content"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Finding...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Discover</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Helper text */}
      <div className="mt-2 flex items-center justify-between px-1">
        <p className="text-xs text-text-tertiary">
          Press <kbd className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd> to search
        </p>
        <span className={cn(
          'text-xs transition-colors',
          value.length > maxLength * 0.8 ? 'text-warning' : 'text-text-tertiary'
        )}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

export default PromptInput;
