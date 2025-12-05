import { MetadataRoute } from 'next';
import { CURATED_CATEGORIES, MOODS, GENRE_SLUGS, MOVIE_GENRES, TV_GENRES } from '@/lib/constants';

// ==========================================================================
// Dynamic Sitemap Generation
// Generates sitemap for all static and dynamic pages
// ==========================================================================

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = new Date();

  // Static pages with high priority
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/discover`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blend`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/watchlist`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // Browse pages
  const browsePages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/movies`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tv`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/animation`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/anime`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/new/movies`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/new/shows`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // Category pages
  const categoryPages: MetadataRoute.Sitemap = CURATED_CATEGORIES.map((category) => ({
    url: `${BASE_URL}/category/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // Mood pages
  const moodPages: MetadataRoute.Sitemap = MOODS.map((mood) => ({
    url: `${BASE_URL}/mood/${mood.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Movie genre pages
  const movieGenrePages: MetadataRoute.Sitemap = Object.entries(MOVIE_GENRES).map(([id, name]) => {
    const slug = Object.entries(GENRE_SLUGS).find(([, genreId]) => genreId === parseInt(id))?.[0];
    if (!slug) return null;
    return {
      url: `${BASE_URL}/genre/movie/${slug}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  }).filter((page): page is NonNullable<typeof page> => page !== null);

  // TV genre pages
  const tvGenrePages: MetadataRoute.Sitemap = Object.entries(TV_GENRES).map(([id, name]) => {
    const slug = Object.entries(GENRE_SLUGS).find(([, genreId]) => genreId === parseInt(id))?.[0];
    if (!slug) return null;
    return {
      url: `${BASE_URL}/genre/tv/${slug}`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    };
  }).filter((page): page is NonNullable<typeof page> => page !== null);

  return [
    ...staticPages,
    ...browsePages,
    ...categoryPages,
    ...moodPages,
    ...movieGenrePages,
    ...tvGenrePages,
  ];
}
