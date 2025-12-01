'use client';

import { Heart, Sparkles, Star } from 'lucide-react';

// ==========================================================================
// WhyPeopleLove Component
// Displays key traits/reasons why people love a piece of content
// ==========================================================================

interface WhyPeopleLoveProps {
  title: string;
  traits: string[];
  className?: string;
}

const TRAIT_ICONS = [
  { icon: Heart, color: 'text-error' },
  { icon: Star, color: 'text-warning' },
  { icon: Sparkles, color: 'text-accent-primary' },
];

export function WhyPeopleLove({ title, traits, className = '' }: WhyPeopleLoveProps) {
  if (traits.length === 0) return null;

  return (
    <div className={className}>
      <h2 className="mb-4 text-lg font-semibold text-text-primary">
        Why People Love <span className="text-accent-primary">{title}</span>
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        {traits.map((trait, index) => {
          const { icon: Icon, color } = TRAIT_ICONS[index % TRAIT_ICONS.length]!;

          return (
            <div
              key={index}
              className="flex items-start gap-3 rounded-lg border border-border-subtle bg-bg-secondary/50 p-4"
            >
              <div className={`flex-shrink-0 ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm text-text-secondary">{trait}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
