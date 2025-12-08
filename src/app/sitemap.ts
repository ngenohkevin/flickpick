import { MetadataRoute } from 'next';
import { CURATED_CATEGORIES, MOODS, GENRE_SLUGS, MOVIE_GENRES, TV_GENRES } from '@/lib/constants';
import {
  getTopRatedMovies,
  getPopularMovies,
  getTopRatedTVShows,
  getPopularTVShows,
  getTrendingMovies,
  getTrendingTVShows,
} from '@/lib/tmdb';
import { createSlug } from '@/lib/utils';

// ==========================================================================
// Dynamic Sitemap Generation
// Comprehensive sitemap for maximum SEO coverage
// ==========================================================================

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

// Cache the sitemap generation results to avoid excessive API calls
let cachedSitemap: MetadataRoute.Sitemap | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Return cached sitemap if still valid
  if (cachedSitemap && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedSitemap;
  }

  const currentDate = new Date();

  // ==========================================================================
  // Static Pages (High Priority)
  // ==========================================================================
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
      url: `${BASE_URL}/calendar`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  // ==========================================================================
  // Browse Pages
  // ==========================================================================
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

  // ==========================================================================
  // Category Pages
  // ==========================================================================
  const categoryPages: MetadataRoute.Sitemap = CURATED_CATEGORIES.map((category) => ({
    url: `${BASE_URL}/category/${category.slug}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  // ==========================================================================
  // Mood Pages
  // ==========================================================================
  const moodPages: MetadataRoute.Sitemap = MOODS.map((mood) => ({
    url: `${BASE_URL}/mood/${mood.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // ==========================================================================
  // Movie Genre Pages
  // ==========================================================================
  const movieGenrePages: MetadataRoute.Sitemap = Object.entries(MOVIE_GENRES)
    .map(([id]) => {
      const slug = Object.entries(GENRE_SLUGS).find(
        ([, genreId]) => genreId === parseInt(id)
      )?.[0];
      if (!slug) return null;
      return {
        url: `${BASE_URL}/genre/movie/${slug}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      };
    })
    .filter((page): page is NonNullable<typeof page> => page !== null);

  // ==========================================================================
  // TV Genre Pages
  // ==========================================================================
  const tvGenrePages: MetadataRoute.Sitemap = Object.entries(TV_GENRES)
    .map(([id]) => {
      const slug = Object.entries(GENRE_SLUGS).find(
        ([, genreId]) => genreId === parseInt(id)
      )?.[0];
      if (!slug) return null;
      return {
        url: `${BASE_URL}/genre/tv/${slug}`,
        lastModified: currentDate,
        changeFrequency: 'daily' as const,
        priority: 0.7,
      };
    })
    .filter((page): page is NonNullable<typeof page> => page !== null);

  // ==========================================================================
  // Dynamic Content - Popular Movies & TV Shows
  // Fetch top content for individual pages and similar pages
  // ==========================================================================
  let moviePages: MetadataRoute.Sitemap = [];
  let tvPages: MetadataRoute.Sitemap = [];
  let similarMoviePages: MetadataRoute.Sitemap = [];
  let similarTVPages: MetadataRoute.Sitemap = [];

  try {
    // Fetch multiple pages of movies (top 200)
    const [topRatedMovies1, topRatedMovies2, popularMovies1, popularMovies2, trendingMovies] =
      await Promise.all([
        getTopRatedMovies(1),
        getTopRatedMovies(2),
        getPopularMovies(1),
        getPopularMovies(2),
        getTrendingMovies('week', 1),
      ]);

    // Combine and deduplicate movies
    const allMovies = new Map<number, { title: string; id: number; release_date?: string }>();
    [
      ...(topRatedMovies1.results ?? []),
      ...(topRatedMovies2.results ?? []),
      ...(popularMovies1.results ?? []),
      ...(popularMovies2.results ?? []),
      ...(trendingMovies.results ?? []),
    ].forEach((movie) => {
      if (!allMovies.has(movie.id)) {
        allMovies.set(movie.id, {
          title: movie.title,
          id: movie.id,
          release_date: movie.release_date,
        });
      }
    });

    // Generate movie detail pages and similar pages
    for (const movie of allMovies.values()) {
      const slug = `${createSlug(movie.title)}-${movie.id}`;

      // Movie detail page
      moviePages.push({
        url: `${BASE_URL}/movie/${movie.id}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      });

      // Similar page - HIGH PRIORITY for "movies like X" searches
      similarMoviePages.push({
        url: `${BASE_URL}/similar/movie/${slug}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.9, // High priority for similar pages
      });
    }
  } catch (error) {
    console.error('Error generating movie sitemap entries:', error);
  }

  try {
    // Fetch multiple pages of TV shows (top 200)
    const [topRatedTV1, topRatedTV2, popularTV1, popularTV2, trendingTV] = await Promise.all([
      getTopRatedTVShows(1),
      getTopRatedTVShows(2),
      getPopularTVShows(1),
      getPopularTVShows(2),
      getTrendingTVShows('week', 1),
    ]);

    // Combine and deduplicate TV shows
    const allShows = new Map<number, { name: string; id: number; first_air_date?: string }>();
    [
      ...(topRatedTV1.results ?? []),
      ...(topRatedTV2.results ?? []),
      ...(popularTV1.results ?? []),
      ...(popularTV2.results ?? []),
      ...(trendingTV.results ?? []),
    ].forEach((show) => {
      if (!allShows.has(show.id)) {
        allShows.set(show.id, {
          name: show.name,
          id: show.id,
          first_air_date: show.first_air_date,
        });
      }
    });

    // Generate TV detail pages and similar pages
    for (const show of allShows.values()) {
      const slug = `${createSlug(show.name)}-${show.id}`;

      // TV detail page
      tvPages.push({
        url: `${BASE_URL}/tv/${show.id}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      });

      // Similar page - HIGH PRIORITY for "shows like X" searches
      similarTVPages.push({
        url: `${BASE_URL}/similar/tv/${slug}`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.9, // High priority for similar pages
      });
    }
  } catch (error) {
    console.error('Error generating TV sitemap entries:', error);
  }

  // ==========================================================================
  // Combine All Sitemap Entries
  // ==========================================================================
  const result = [
    ...staticPages,
    ...browsePages,
    ...categoryPages,
    ...moodPages,
    ...movieGenrePages,
    ...tvGenrePages,
    ...similarMoviePages, // Similar pages first - high priority for SEO
    ...similarTVPages,
    ...moviePages,
    ...tvPages,
  ];

  // Cache the result
  cachedSitemap = result;
  cacheTime = Date.now();

  return result;
}
