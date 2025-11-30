'use client';

import Link from 'next/link';
import {
  TrendingUp,
  Sparkles,
  Star,
  Gem,
  Trophy,
  Film,
  Users,
  Globe,
  ChevronRight,
} from 'lucide-react';
import { CURATED_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Category } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface CategoryGridProps {
  className?: string;
  limit?: number;
}

interface CategoryCardProps {
  category: Category;
  variant?: 'default' | 'compact';
}

// ==========================================================================
// Icon Mapping
// ==========================================================================

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  trending: TrendingUp,
  'new-releases': Sparkles,
  'top-rated': Star,
  'hidden-gems': Gem,
  'award-winners': Trophy,
  classics: Film,
  'family-friendly': Users,
  international: Globe,
};

// ==========================================================================
// Gradient Colors for Categories
// ==========================================================================

const CATEGORY_GRADIENTS: Record<string, string> = {
  trending: 'from-rose-500 to-orange-500',
  'new-releases': 'from-blue-500 to-cyan-500',
  'top-rated': 'from-amber-500 to-yellow-500',
  'hidden-gems': 'from-emerald-500 to-teal-500',
  'award-winners': 'from-amber-600 to-yellow-600',
  classics: 'from-slate-500 to-slate-700',
  'family-friendly': 'from-green-500 to-emerald-500',
  international: 'from-purple-500 to-indigo-500',
};

// ==========================================================================
// Category Card Component
// ==========================================================================

export function CategoryCard({ category, variant = 'default' }: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[category.slug] || Sparkles;
  const gradient = CATEGORY_GRADIENTS[category.slug] || 'from-gray-500 to-gray-600';

  if (variant === 'compact') {
    return (
      <Link
        href={`/category/${category.slug}`}
        className={cn(
          'group flex items-center gap-3 rounded-lg p-3 transition-all duration-200',
          'bg-bg-secondary border border-border-subtle',
          'hover:bg-bg-tertiary hover:border-border-default hover:shadow-md'
        )}
      >
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br',
            gradient
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-text-primary truncate">{category.name}</h3>
          <p className="text-xs text-text-tertiary truncate">{category.description}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
      </Link>
    );
  }

  return (
    <Link
      href={`/category/${category.slug}`}
      className={cn(
        'group relative overflow-hidden rounded-xl p-6 transition-all duration-300',
        'hover:scale-105 hover:shadow-xl',
        `bg-gradient-to-br ${gradient}`
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/20" />
        <div className="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-white/20" />
      </div>

      {/* Content */}
      <div className="relative">
        <Icon className="h-8 w-8 text-white/90 mb-3" />
        <h3 className="font-semibold text-white text-lg">{category.name}</h3>
        <p className="mt-1 text-sm text-white/70 line-clamp-2">{category.description}</p>
      </div>

      {/* Hover arrow */}
      <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
        <ChevronRight className="h-6 w-6 text-white/80" />
      </div>
    </Link>
  );
}

// ==========================================================================
// Category Grid Component
// ==========================================================================

export function CategoryGrid({ className = '', limit }: CategoryGridProps) {
  const categories = limit ? CURATED_CATEGORIES.slice(0, limit) : CURATED_CATEGORIES;

  return (
    <div className={cn('grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4', className)}>
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} />
      ))}
    </div>
  );
}

// ==========================================================================
// Compact Category List
// ==========================================================================

interface CategoryListProps {
  className?: string;
  limit?: number;
}

export function CategoryList({ className = '', limit }: CategoryListProps) {
  const categories = limit ? CURATED_CATEGORIES.slice(0, limit) : CURATED_CATEGORIES;

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {categories.map((category) => (
        <CategoryCard key={category.slug} category={category} variant="compact" />
      ))}
    </div>
  );
}

// ==========================================================================
// Category Pills (Horizontal Scroll)
// ==========================================================================

interface CategoryPillsProps {
  className?: string;
  activeSlug?: string;
}

export function CategoryPills({ className = '', activeSlug }: CategoryPillsProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto scrollbar-hide pb-2', className)}>
      {CURATED_CATEGORIES.map((category) => {
        const Icon = CATEGORY_ICONS[category.slug] || Sparkles;
        const isActive = category.slug === activeSlug;

        return (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className={cn(
              'flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-accent-primary text-white'
                : 'bg-bg-tertiary text-text-secondary hover:bg-border-default hover:text-text-primary'
            )}
          >
            <Icon className="h-4 w-4" />
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
