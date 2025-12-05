// ==========================================================================
// JSON-LD Structured Data Generators
// Creates schema.org compliant structured data for SEO
// ==========================================================================

import { TMDB_IMAGE_BASE_URL } from './constants';

// ==========================================================================
// Types
// ==========================================================================

interface MovieData {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  runtime?: number;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast: Array<{ name: string; character: string }>;
    crew: Array<{ name: string; job: string }>;
  };
}

interface TVShowData {
  id: number;
  name: string;
  overview: string;
  first_air_date: string;
  last_air_date?: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time?: number[];
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  backdrop_path: string | null;
  status: string;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast: Array<{ name: string; character: string }>;
    crew: Array<{ name: string; job: string }>;
  };
  created_by?: Array<{ name: string }>;
}

// ==========================================================================
// Movie JSON-LD
// ==========================================================================

export function generateMovieJsonLd(movie: MovieData, url: string): object {
  const directors = movie.credits?.crew
    .filter((person) => person.job === 'Director')
    .map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  const actors = movie.credits?.cast
    .slice(0, 10)
    .map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  return {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    url,
    image: movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL}/w500${movie.poster_path}`
      : undefined,
    datePublished: movie.release_date || undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres?.map((g) => g.name) || [],
    aggregateRating: movie.vote_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: movie.vote_average.toFixed(1),
          ratingCount: movie.vote_count,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    director: directors.length > 0 ? directors : undefined,
    actor: actors.length > 0 ? actors : undefined,
  };
}

// ==========================================================================
// TV Show JSON-LD
// ==========================================================================

export function generateTVShowJsonLd(show: TVShowData, url: string): object {
  const creators = show.created_by?.map((person) => ({
    '@type': 'Person',
    name: person.name,
  })) || [];

  const actors = show.credits?.cast
    .slice(0, 10)
    .map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  // Calculate average episode duration
  const avgDuration = show.episode_run_time && show.episode_run_time.length > 0
    ? Math.round(show.episode_run_time.reduce((a, b) => a + b, 0) / show.episode_run_time.length)
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.name,
    description: show.overview,
    url,
    image: show.poster_path
      ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}`
      : undefined,
    datePublished: show.first_air_date || undefined,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    genre: show.genres?.map((g) => g.name) || [],
    aggregateRating: show.vote_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: show.vote_average.toFixed(1),
          ratingCount: show.vote_count,
          bestRating: 10,
          worstRating: 0,
        }
      : undefined,
    creator: creators.length > 0 ? creators : undefined,
    actor: actors.length > 0 ? actors : undefined,
    duration: avgDuration ? `PT${avgDuration}M` : undefined,
  };
}

// ==========================================================================
// Website JSON-LD (for homepage)
// ==========================================================================

export function generateWebsiteJsonLd(url: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FlickPick',
    description: 'Find your next favorite movie or TV show with AI-powered recommendations, mood-based discovery, and streaming availability.',
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

// ==========================================================================
// Organization JSON-LD
// ==========================================================================

export function generateOrganizationJsonLd(url: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FlickPick',
    url,
    logo: `${url}/icon.png`,
    sameAs: [],
  };
}

// ==========================================================================
// Breadcrumb JSON-LD
// ==========================================================================

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
