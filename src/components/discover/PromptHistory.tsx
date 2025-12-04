'use client';

import { History, X, Trash2 } from 'lucide-react';
import { usePromptHistory, useRecentPrompts, useHasHistory } from '@/stores/promptHistory';
import { cn } from '@/lib/utils';

// ==========================================================================
// Prompt History Component
// Shows recent search prompts for quick re-use
// ==========================================================================

interface PromptHistoryProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PromptHistory({
  onSelect,
  disabled = false,
  className = '',
}: PromptHistoryProps) {
  const recentPrompts = useRecentPrompts(5);
  const hasHistory = useHasHistory();
  const { removePrompt, clearHistory } = usePromptHistory();

  if (!hasHistory) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-text-tertiary">
          <History className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">Recent searches</span>
        </div>
        <button
          type="button"
          onClick={clearHistory}
          disabled={disabled}
          className={cn(
            'flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="Clear history"
        >
          <Trash2 className="h-3 w-3" />
          <span>Clear</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {recentPrompts.map((item) => (
          <div
            key={item.prompt}
            className={cn(
              'group relative flex items-center gap-1 rounded-full',
              'bg-bg-tertiary/50 hover:bg-bg-tertiary',
              'border border-transparent hover:border-border-subtle',
              'transition-all duration-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <button
              type="button"
              onClick={() => !disabled && onSelect(item.prompt)}
              disabled={disabled}
              className="px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors max-w-[200px] truncate"
              title={item.prompt}
            >
              {item.prompt}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePrompt(item.prompt);
              }}
              disabled={disabled}
              className={cn(
                'pr-2 opacity-0 group-hover:opacity-100 transition-opacity',
                'text-text-tertiary hover:text-red-400',
                disabled && 'hidden'
              )}
              aria-label={`Remove "${item.prompt}" from history`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptHistory;
