import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { MOODS } from '@/lib/constants';

// ==========================================================================
// Mood Page Layout
// Handles SEO metadata generation for mood-based discovery pages
// ==========================================================================

interface MoodLayoutProps {
  children: React.ReactNode;
  params: Promise<{ mood: string }>;
}

/**
 * Generate static params for all moods
 * This enables static generation for known mood pages
 */
export async function generateStaticParams() {
  return MOODS.map((mood) => ({
    mood: mood.slug,
  }));
}

/**
 * Generate dynamic metadata based on mood
 */
export async function generateMetadata({ params }: MoodLayoutProps): Promise<Metadata> {
  const { mood } = await params;
  const moodConfig = MOODS.find((m) => m.slug === mood);

  if (!moodConfig) {
    return {
      title: 'Mood Not Found',
      description: 'The requested mood could not be found.',
    };
  }

  // The root layout's template appends " | FlickPick" to the page title;
  // social titles aren't templated, so they carry it explicitly
  const title = `${moodConfig.name} Movies & Shows`;
  const socialTitle = `${title} | FlickPick`;
  const description = `${moodConfig.description}. Discover ${moodConfig.name.toLowerCase()} movies and TV shows with AI-powered recommendations tailored to your mood.`;

  return {
    title,
    description,
    keywords: [
      moodConfig.name.toLowerCase(),
      `${moodConfig.name.toLowerCase()} movies`,
      `${moodConfig.name.toLowerCase()} tv shows`,
      'movie recommendations',
      'tv show recommendations',
      'what to watch',
      'mood-based recommendations',
      'FlickPick',
    ],
    openGraph: {
      title: socialTitle,
      description,
      type: 'website',
      siteName: 'FlickPick',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
    },
    alternates: {
      canonical: `/mood/${mood}`,
    },
  };
}

export default async function MoodLayout({ children, params }: MoodLayoutProps) {
  const { mood } = await params;
  const moodConfig = MOODS.find((m) => m.slug === mood);

  // Return 404 for invalid moods
  if (!moodConfig) {
    notFound();
  }

  return <>{children}</>;
}
