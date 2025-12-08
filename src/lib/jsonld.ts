// ==========================================================================
// JSON-LD Structured Data Generators
// Creates schema.org compliant structured data for SEO
// ==========================================================================

import { TMDB_IMAGE_BASE_URL } from './constants';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

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
  videos?: Array<{
    key: string;
    name: string;
    type: string;
    site: string;
    official?: boolean;
  }>;
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
  videos?: Array<{
    key: string;
    name: string;
    type: string;
    site: string;
    official?: boolean;
  }>;
}

interface ContentItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type?: 'movie' | 'tv';
}

// ==========================================================================
// Movie JSON-LD
// ==========================================================================

export function generateMovieJsonLd(movie: MovieData, url: string): object {
  const directors =
    movie.credits?.crew
      .filter((person) => person.job === 'Director')
      .map((person) => ({
        '@type': 'Person',
        name: person.name,
      })) || [];

  const actors =
    movie.credits?.cast.slice(0, 10).map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  // Find trailer for VideoObject
  const trailer = movie.videos?.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  const jsonLd: Record<string, unknown> = {
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
    aggregateRating:
      movie.vote_count > 0
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

  // Add trailer as VideoObject
  if (trailer) {
    jsonLd.trailer = {
      '@type': 'VideoObject',
      name: trailer.name,
      description: `Official trailer for ${movie.title}`,
      thumbnailUrl: `https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
      uploadDate: movie.release_date || undefined,
    };
  }

  return jsonLd;
}

// ==========================================================================
// TV Show JSON-LD
// ==========================================================================

export function generateTVShowJsonLd(show: TVShowData, url: string): object {
  const creators =
    show.created_by?.map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  const actors =
    show.credits?.cast.slice(0, 10).map((person) => ({
      '@type': 'Person',
      name: person.name,
    })) || [];

  // Calculate average episode duration
  const avgDuration =
    show.episode_run_time && show.episode_run_time.length > 0
      ? Math.round(show.episode_run_time.reduce((a, b) => a + b, 0) / show.episode_run_time.length)
      : undefined;

  // Find trailer for VideoObject
  const trailer = show.videos?.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.name,
    description: show.overview,
    url,
    image: show.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${show.poster_path}` : undefined,
    datePublished: show.first_air_date || undefined,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    genre: show.genres?.map((g) => g.name) || [],
    aggregateRating:
      show.vote_count > 0
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

  // Add trailer as VideoObject
  if (trailer) {
    jsonLd.trailer = {
      '@type': 'VideoObject',
      name: trailer.name,
      description: `Official trailer for ${show.name}`,
      thumbnailUrl: `https://img.youtube.com/vi/${trailer.key}/maxresdefault.jpg`,
      embedUrl: `https://www.youtube.com/embed/${trailer.key}`,
      uploadDate: show.first_air_date || undefined,
    };
  }

  return jsonLd;
}

// ==========================================================================
// Website JSON-LD (for homepage)
// ==========================================================================

export function generateWebsiteJsonLd(url: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FlickPick',
    description:
      'Find your next favorite movie or TV show with AI-powered recommendations, mood-based discovery, and streaming availability.',
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

// ==========================================================================
// ItemList JSON-LD (for collection pages - genre, category, similar)
// Great for "movies like X" and collection pages
// ==========================================================================

export function generateItemListJsonLd(
  items: ContentItem[],
  listName: string,
  listDescription: string,
  url: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    description: listDescription,
    url,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': item.media_type === 'tv' ? 'TVSeries' : 'Movie',
        name: item.title || item.name,
        url: `${BASE_URL}/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`,
        image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${item.poster_path}` : undefined,
        aggregateRating: item.vote_average
          ? {
              '@type': 'AggregateRating',
              ratingValue: item.vote_average.toFixed(1),
              bestRating: 10,
              worstRating: 0,
            }
          : undefined,
        datePublished: item.release_date || item.first_air_date || undefined,
      },
    })),
  };
}

// ==========================================================================
// Similar Content JSON-LD (specialized for "movies like X" pages)
// ==========================================================================

interface SimilarContentData {
  sourceTitle: string;
  sourceType: 'movie' | 'tv';
  sourceId: number;
  sourceYear?: number;
  sourceGenres?: string[];
  similarItems: ContentItem[];
}

export function generateSimilarContentJsonLd(data: SimilarContentData, url: string): object {
  const typeLabel = data.sourceType === 'tv' ? 'TV shows' : 'movies';
  const listName = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} Similar to ${data.sourceTitle}`;
  const listDescription = `Discover ${typeLabel} like ${data.sourceTitle}${data.sourceYear ? ` (${data.sourceYear})` : ''}. Find similar ${typeLabel} based on genre, themes, and style.`;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    description: listDescription,
    url,
    numberOfItems: data.similarItems.length,
    mainEntity: {
      '@type': data.sourceType === 'tv' ? 'TVSeries' : 'Movie',
      name: data.sourceTitle,
      url: `${BASE_URL}/${data.sourceType}/${data.sourceId}`,
      genre: data.sourceGenres || [],
    },
    itemListElement: data.similarItems.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': item.media_type === 'tv' || 'first_air_date' in item ? 'TVSeries' : 'Movie',
        name: item.title || item.name,
        url: `${BASE_URL}/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`,
        image: item.poster_path ? `${TMDB_IMAGE_BASE_URL}/w500${item.poster_path}` : undefined,
        aggregateRating: item.vote_average
          ? {
              '@type': 'AggregateRating',
              ratingValue: item.vote_average.toFixed(1),
              bestRating: 10,
              worstRating: 0,
            }
          : undefined,
      },
    })),
  };
}

// ==========================================================================
// VideoObject JSON-LD (for trailers)
// ==========================================================================

interface VideoData {
  key: string;
  name: string;
  type: string;
  site: string;
  official?: boolean;
  published_at?: string;
}

export function generateVideoObjectJsonLd(
  video: VideoData,
  contentTitle: string,
  contentDescription: string,
  releaseDate?: string
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: video.name || `${contentTitle} - ${video.type}`,
    description: contentDescription || `Watch the ${video.type.toLowerCase()} for ${contentTitle}`,
    thumbnailUrl: `https://img.youtube.com/vi/${video.key}/maxresdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${video.key}`,
    contentUrl: `https://www.youtube.com/watch?v=${video.key}`,
    uploadDate: video.published_at || releaseDate || undefined,
    duration: undefined, // YouTube doesn't provide this in TMDB data
  };
}

// ==========================================================================
// FAQ JSON-LD (for popular titles - great for featured snippets)
// ==========================================================================

interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQJsonLd(faqs: FAQItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

// ==========================================================================
// Helper: Generate FAQs for Movies
// ==========================================================================

export function generateMovieFAQs(movie: MovieData): FAQItem[] {
  const faqs: FAQItem[] = [];
  const genres = movie.genres?.map((g) => g.name).join(', ') || 'various genres';
  const year = movie.release_date?.split('-')[0];
  const directors =
    movie.credits?.crew
      .filter((p) => p.job === 'Director')
      .map((p) => p.name)
      .join(', ') || 'Unknown';
  const cast =
    movie.credits?.cast
      .slice(0, 5)
      .map((p) => p.name)
      .join(', ') || 'Unknown';

  faqs.push({
    question: `What is ${movie.title} about?`,
    answer:
      movie.overview ||
      `${movie.title} is a ${genres} film${year ? ` released in ${year}` : ''}.`,
  });

  faqs.push({
    question: `Where can I watch movies similar to ${movie.title}?`,
    answer: `You can find movies similar to ${movie.title} on FlickPick. We offer recommendations based on genre, themes, and style to help you discover your next favorite film.`,
  });

  if (directors !== 'Unknown') {
    faqs.push({
      question: `Who directed ${movie.title}?`,
      answer: `${movie.title} was directed by ${directors}.`,
    });
  }

  if (cast !== 'Unknown') {
    faqs.push({
      question: `Who stars in ${movie.title}?`,
      answer: `${movie.title} stars ${cast}.`,
    });
  }

  if (movie.runtime) {
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    const durationStr =
      hours > 0 ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minutes` : `${minutes} minutes`;
    faqs.push({
      question: `How long is ${movie.title}?`,
      answer: `${movie.title} has a runtime of ${durationStr}.`,
    });
  }

  return faqs;
}

// ==========================================================================
// Helper: Generate FAQs for TV Shows
// ==========================================================================

export function generateTVShowFAQs(show: TVShowData): FAQItem[] {
  const faqs: FAQItem[] = [];
  const genres = show.genres?.map((g) => g.name).join(', ') || 'various genres';
  const year = show.first_air_date?.split('-')[0];
  const creators =
    show.created_by?.map((p) => p.name).join(', ') || 'Unknown';
  const cast =
    show.credits?.cast
      .slice(0, 5)
      .map((p) => p.name)
      .join(', ') || 'Unknown';

  faqs.push({
    question: `What is ${show.name} about?`,
    answer:
      show.overview ||
      `${show.name} is a ${genres} TV series${year ? ` that premiered in ${year}` : ''}.`,
  });

  faqs.push({
    question: `Where can I find TV shows similar to ${show.name}?`,
    answer: `You can find TV shows similar to ${show.name} on FlickPick. We offer recommendations based on genre, themes, and style to help you discover your next binge-worthy series.`,
  });

  faqs.push({
    question: `How many seasons does ${show.name} have?`,
    answer: `${show.name} has ${show.number_of_seasons} season${show.number_of_seasons > 1 ? 's' : ''} with ${show.number_of_episodes} total episodes.`,
  });

  if (creators !== 'Unknown') {
    faqs.push({
      question: `Who created ${show.name}?`,
      answer: `${show.name} was created by ${creators}.`,
    });
  }

  if (cast !== 'Unknown') {
    faqs.push({
      question: `Who stars in ${show.name}?`,
      answer: `${show.name} stars ${cast}.`,
    });
  }

  faqs.push({
    question: `Is ${show.name} still airing?`,
    answer: `${show.name} is currently ${show.status.toLowerCase()}${show.status === 'Ended' ? '.' : ', with new episodes coming.'}`,
  });

  return faqs;
}

// ==========================================================================
// Helper: Generate FAQs for Similar Pages
// ==========================================================================

export function generateSimilarFAQs(
  sourceTitle: string,
  sourceType: 'movie' | 'tv',
  topSimilar: string[]
): FAQItem[] {
  const typeLabel = sourceType === 'tv' ? 'TV shows' : 'movies';
  const similarList = topSimilar.slice(0, 5).join(', ');

  return [
    {
      question: `What ${typeLabel} are similar to ${sourceTitle}?`,
      answer: `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} similar to ${sourceTitle} include ${similarList}, and more. These share similar themes, genres, or storytelling styles.`,
    },
    {
      question: `Where can I find more ${typeLabel} like ${sourceTitle}?`,
      answer: `FlickPick helps you discover ${typeLabel} similar to ${sourceTitle} using AI-powered recommendations and TasteDive data. Browse our similar content pages or use our AI discovery feature.`,
    },
    {
      question: `Why do people like ${sourceTitle}?`,
      answer: `Fans of ${sourceTitle} typically enjoy its unique blend of storytelling, memorable characters, and engaging themes. If you enjoyed it, you'll likely enjoy similar ${typeLabel} in the same genre.`,
    },
  ];
}

// ==========================================================================
// CollectionPage JSON-LD (for genre/category pages)
// ==========================================================================

export function generateCollectionPageJsonLd(
  name: string,
  description: string,
  url: string,
  items: ContentItem[]
): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 10).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${BASE_URL}/${item.media_type === 'tv' ? 'tv' : 'movie'}/${item.id}`,
      })),
    },
  };
}
