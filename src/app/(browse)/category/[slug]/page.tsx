import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoryPageContent } from './CategoryPageContent';
import { SkeletonGrid } from '@/components/ui';
import { CURATED_CATEGORIES } from '@/lib/constants';

// ==========================================================================
// Types
// ==========================================================================

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

// ==========================================================================
// Metadata
// ==========================================================================

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = CURATED_CATEGORIES.find((c) => c.slug === slug);

  if (!category) {
    return { title: 'Category Not Found' };
  }

  return {
    title: `${category.name} | FlickPick`,
    description: `${category.description}. Discover the best ${category.name.toLowerCase()} movies and TV shows.`,
    openGraph: {
      title: `${category.name} | FlickPick`,
      description: `${category.description}. Discover the best ${category.name.toLowerCase()} movies and TV shows.`,
      type: 'website',
    },
  };
}

// ==========================================================================
// Static Params Generation
// ==========================================================================

export async function generateStaticParams() {
  return CURATED_CATEGORIES.map((category) => ({
    slug: category.slug,
  }));
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = CURATED_CATEGORIES.find((c) => c.slug === slug);

  if (!category) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary">
          <div className="border-b border-border-subtle">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
              <div className="h-10 w-64 animate-pulse rounded bg-bg-tertiary" />
              <div className="mt-2 h-5 w-96 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <SkeletonGrid count={20} columns={6} />
          </div>
        </div>
      }
    >
      <CategoryPageContent category={category} />
    </Suspense>
  );
}
