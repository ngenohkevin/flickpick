// ==========================================================================
// Movie Details Page
// /movie/[id] - Shows full movie information with trailer, similar, cast
// ==========================================================================

// ISR: Revalidate every 24 hours - movie details don't change frequently
export const revalidate = 86400;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, Calendar, Play, ExternalLink, Globe, DollarSign, Film, Clapperboard } from 'lucide-react';
import { getMovieDetailsExtended, getRelatedMovies } from '@/lib/tmdb/movies';
import { getPosterUrl, getBackdropUrl, formatRuntime, extractYear, cn, createSlug } from '@/lib/utils';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import dynamic from 'next/dynamic';
import { ContentRow } from '@/components/content';
import { CastSection } from '@/components/movie/CastSection';
import { StreamingProviders } from '@/components/movie/StreamingProviders';
import { WatchlistButton, ShareButton } from '@/components/ui';
import { ContentViewTracker } from '@/components/analytics/ContentViewTracker';
import {
  generateMovieJsonLd,
  generateBreadcrumbJsonLd,
  generateFAQJsonLd,
  generateMovieFAQs,
} from '@/lib/jsonld';

// Dynamic import for TrailerEmbed - loads YouTube player only when needed
const TrailerEmbed = dynamic(
  () => import('@/components/movie/TrailerEmbed').then((mod) => mod.TrailerEmbed),
  {
    loading: () => (
      <section id="trailer">
        <div className="mb-4 sm:mb-6">
          <div className="h-7 w-24 animate-pulse rounded bg-bg-tertiary" />
        </div>
        <div className="aspect-video animate-pulse rounded-xl bg-bg-tertiary" />
      </section>
    ),
  }
);
import { hasTrailer } from '@/lib/video-utils';
import type { ContentType, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

// ==========================================================================
// SEO-Optimized Metadata Generation
// ==========================================================================

export async function generateMetadata({ params }: MoviePageProps): Promise<Metadata> {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    return { title: 'Movie Not Found | FlickPick' };
  }

  try {
    const movie = await getMovieDetailsExtended(movieId);
    const year = extractYear(movie.release_date);
    const genres = movie.genres?.map((g) => g.name) || [];
    const genreText = genres.slice(0, 2).join(' & ') || 'Film';
    const directors = movie.credits.crew
      .filter((p) => p.job === 'Director')
      .map((p) => p.name)
      .slice(0, 2);

    // SEO-optimized title
    const pageTitle = year
      ? `${movie.title} (${year}) - ${genreText} Movie`
      : `${movie.title} - ${genreText} Movie`;

    // SEO-optimized description
    const description =
      movie.overview ||
      `Watch ${movie.title}${year ? ` (${year})` : ''} - ${genreText} movie${directors.length ? ` directed by ${directors.join(' & ')}` : ''}. Find where to stream, get similar movie recommendations, and more.`;

    // Canonical URL
    const canonicalUrl = `${BASE_URL}/movie/${movieId}`;

    // Generate custom OG image URL
    const ogParams = new URLSearchParams({
      title: movie.title,
      type: getMovieContentTypeForMeta(movie),
      ...(movie.vote_average > 0 && { rating: movie.vote_average.toFixed(1) }),
      ...(year && { year: year.toString() }),
      ...(movie.tagline && { subtitle: movie.tagline }),
      ...(movie.poster_path && {
        poster: `https://image.tmdb.org/t/p/w342${movie.poster_path}`,
      }),
      ...(movie.backdrop_path && {
        backdrop: `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`,
      }),
    });
    const ogImage = `${BASE_URL}/api/og?${ogParams.toString()}`;

    // Fallback OG image (TMDB backdrop)
    const fallbackOgImage = movie.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`
      : movie.poster_path
        ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
        : undefined;

    return {
      title: pageTitle,
      description: description.slice(0, 160),
      keywords: [
        movie.title,
        `${movie.title} movie`,
        `watch ${movie.title}`,
        `${movie.title} streaming`,
        `movies like ${movie.title}`,
        `similar to ${movie.title}`,
        ...genres.map((g) => `${g.toLowerCase()} movies`),
        ...directors.map((d) => `${d} movies`),
        year ? `${year} movies` : '',
      ].filter(Boolean),
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: `${movie.title}${year ? ` (${year})` : ''} | FlickPick`,
        description: description.slice(0, 200),
        url: canonicalUrl,
        siteName: 'FlickPick',
        type: 'video.movie',
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${movie.title} on FlickPick`,
          },
          ...(fallbackOgImage
            ? [
                {
                  url: fallbackOgImage,
                  width: 1280,
                  height: 720,
                  alt: `${movie.title} backdrop`,
                },
              ]
            : []),
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${movie.title}${year ? ` (${year})` : ''} | FlickPick`,
        description: description.slice(0, 200),
        images: [ogImage],
      },
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    };
  } catch {
    return { title: 'Movie Not Found | FlickPick' };
  }
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function MoviePage({ params }: MoviePageProps) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    notFound();
  }

  let movie;
  let relatedMovies;

  try {
    [movie, relatedMovies] = await Promise.all([
      getMovieDetailsExtended(movieId),
      getRelatedMovies(movieId),
    ]);
  } catch {
    notFound();
  }

  const year = extractYear(movie.release_date);
  const contentType = getMovieContentType(movie);
  const backdropUrl = getBackdropUrl(movie.backdrop_path, 'original');
  const posterUrl = getPosterUrl(movie.poster_path, 'large');

  // Get director(s)
  const directors = movie.credits.crew
    .filter((person) => person.job === 'Director')
    .slice(0, 2);

  // Get writers
  const writers = movie.credits.crew
    .filter((person) => person.job === 'Writer' || person.job === 'Screenplay')
    .slice(0, 2);

  // Check if there's a trailer
  const trailerAvailable = hasTrailer(movie.videos || []);

  // Convert related movies to Content type for ContentRow
  const similarContent: Content[] = relatedMovies.slice(0, 12).map((m) => ({
    id: m.id,
    media_type: 'movie' as const,
    title: m.title,
    original_title: m.original_title,
    overview: m.overview,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    release_date: m.release_date,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
    genre_ids: m.genre_ids,
    original_language: m.original_language,
    adult: m.adult,
  }));

  // URL for JSON-LD
  const pageUrl = `${BASE_URL}/movie/${movie.id}`;

  // Movie JSON-LD with trailer
  const movieJsonLd = generateMovieJsonLd(
    {
      ...movie,
      credits: movie.credits,
      videos: movie.videos,
    },
    pageUrl
  );

  // Breadcrumb JSON-LD
  const primaryGenre = movie.genres?.[0];
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: 'Home', url: BASE_URL },
    { name: 'Movies', url: `${BASE_URL}/movies` },
    ...(primaryGenre
      ? [
          {
            name: primaryGenre.name,
            url: `${BASE_URL}/genre/movie/${primaryGenre.name.toLowerCase().replace(/\s+/g, '-')}`,
          },
        ]
      : []),
    { name: movie.title, url: pageUrl },
  ]);

  // FAQ JSON-LD for featured snippets
  const faqJsonLd = generateFAQJsonLd(
    generateMovieFAQs({
      ...movie,
      credits: movie.credits,
    })
  );

  return (
    <>
      {/* Movie JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(movieJsonLd) }}
      />

      {/* Breadcrumb JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* FAQ JSON-LD for featured snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Track content view */}
      <ContentViewTracker
        contentId={movie.id}
        contentType="movie"
        title={movie.title}
      />

      {/* Hero Section */}
      <section className="relative">
        {/* Backdrop Image */}
        {backdropUrl && (
          <div className="absolute inset-0 z-0 h-full">
            <Image
              src={backdropUrl}
              alt=""
              fill
              priority
              className="object-cover object-top"
              sizes="100vw"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/80 to-bg-primary/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/60 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="container relative z-10 pb-6 pt-20 sm:pb-8 sm:pt-24 md:pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
            {/* Mobile Poster + Info Row */}
            <div className="flex gap-4 md:hidden">
              <div className="relative aspect-[2/3] w-28 flex-shrink-0 overflow-hidden rounded-lg shadow-xl ring-1 ring-white/10 sm:w-36">
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="144px"
                />
              </div>
              {/* Mobile Quick Info */}
              <div className="flex flex-col justify-end">
                <ContentTypeBadge type={contentType} />
                {movie.vote_average > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-bold text-warning">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
                {year && (
                  <p className="mt-1 text-xs text-text-secondary">{year}</p>
                )}
                {movie.runtime && movie.runtime > 0 && (
                  <p className="text-xs text-text-secondary">{formatRuntime(movie.runtime)}</p>
                )}
              </div>
            </div>

            {/* Desktop Poster */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative aspect-[2/3] w-64 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 lg:w-80">
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 320px, 256px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              {/* Content Type Badge & Genres - Hidden on mobile (shown in poster section) */}
              <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
                <ContentTypeBadge type={contentType} />
                {movie.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/movie/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
              {/* Mobile Genres */}
              <div className="mb-3 flex flex-wrap gap-1.5 md:hidden">
                {movie.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/movie/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="mt-2 text-sm italic text-text-secondary/90 sm:mt-3 sm:text-base md:text-lg">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}

              {/* Key Stats - Hidden on mobile (shown in poster section) */}
              <div className="mt-6 hidden flex-wrap items-center gap-6 md:flex">
                {/* Rating */}
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-warning/20 px-3 py-1.5">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                      <span className="text-lg font-bold text-warning">
                        {movie.vote_average.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-text-tertiary">
                      {movie.vote_count.toLocaleString()} votes
                    </span>
                  </div>
                )}

                {/* Year */}
                {year && (
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{year}</span>
                  </div>
                )}

                {/* Runtime */}
                {movie.runtime && movie.runtime > 0 && (
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{formatRuntime(movie.runtime)}</span>
                  </div>
                )}
              </div>

              {/* Director & Writer */}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:mt-4 sm:gap-x-6 sm:gap-y-2 sm:text-sm">
                {directors.length > 0 && (
                  <div>
                    <span className="text-text-tertiary">Directed by </span>
                    <span className="font-medium text-text-primary">
                      {directors.map((d) => d.name).join(', ')}
                    </span>
                  </div>
                )}
                {writers.length > 0 && (
                  <div>
                    <span className="text-text-tertiary">Written by </span>
                    <span className="font-medium text-text-primary">
                      {writers.map((w) => w.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Overview */}
              <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:mt-6 sm:text-base md:text-lg">
                {movie.overview || 'No overview available.'}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
                {/* Play Trailer Button */}
                {trailerAvailable && (
                  <a
                    href="#trailer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-white/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                  >
                    <Play className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                    Watch Trailer
                  </a>
                )}

                {/* Watchlist Button */}
                <WatchlistButton
                  id={movie.id}
                  title={movie.title}
                  mediaType="movie"
                  posterPath={movie.poster_path}
                  variant="hero"
                />

                {/* Similar Button */}
                <Link
                  href={`/similar/movie/${movie.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-white/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  Find Similar
                </Link>

                {/* Share Button */}
                <ShareButton
                  title={movie.title}
                  text={movie.tagline || `Check out ${movie.title} on FlickPick`}
                  url={pageUrl}
                  variant="hero"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-12 md:py-16">
        {/* Trailer & About Section - Side by Side */}
        <section className="grid gap-8 lg:grid-cols-2">
          {/* Left: Trailer */}
          <div>
            {movie.videos && movie.videos.length > 0 && (
              <TrailerEmbed
                videos={movie.videos}
                title={movie.title}
                posterPath={movie.poster_path}
              />
            )}
          </div>

          {/* Right: About the Movie */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-3 sm:text-lg sm:mb-4">About the Movie</h2>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                {movie.release_date && (
                  <DetailItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Release Date"
                    value={new Date(movie.release_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  />
                )}
                {movie.runtime && movie.runtime > 0 && (
                  <DetailItem
                    icon={<Clock className="h-4 w-4" />}
                    label="Runtime"
                    value={formatRuntime(movie.runtime)}
                  />
                )}
                {movie.original_language && (
                  <DetailItem
                    icon={<Globe className="h-4 w-4" />}
                    label="Language"
                    value={getLanguageName(movie.original_language)}
                  />
                )}
                {movie.status && (
                  <DetailItem
                    icon={<Film className="h-4 w-4" />}
                    label="Status"
                    value={movie.status}
                  />
                )}
                {movie.budget && movie.budget > 0 && (
                  <DetailItem
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Budget"
                    value={`$${movie.budget.toLocaleString()}`}
                  />
                )}
                {movie.revenue && movie.revenue > 0 && (
                  <DetailItem
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Box Office"
                    value={`$${movie.revenue.toLocaleString()}`}
                  />
                )}
              </div>
              {movie.original_title !== movie.title && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <span className="text-sm text-text-tertiary">Original Title: </span>
                  <span className="text-sm text-text-primary">{movie.original_title}</span>
                </div>
              )}
            </div>

            {/* External Links */}
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 sm:text-sm sm:mb-4">
                External Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {movie.imdb_id && (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdb_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-[#f5c518] px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
                  >
                    <Clapperboard className="h-4 w-4" />
                    IMDb
                  </a>
                )}
                {movie.homepage && (
                  <a
                    href={movie.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-border-default"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                <a
                  href={`https://www.themoviedb.org/movie/${movie.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-border-default"
                >
                  <ExternalLink className="h-4 w-4" />
                  TMDB
                </a>
              </div>
            </div>

            {/* Keywords */}
            {movie.keywords && movie.keywords.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 sm:text-sm sm:mb-4">
                  Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.keywords.slice(0, 10).map((keyword) => (
                    <span
                      key={keyword.id}
                      className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary"
                    >
                      {keyword.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Similar Movies */}
        {similarContent.length > 0 && (
          <div className="mt-16">
            <ContentRow
              title="More Like This"
              items={similarContent}
              href={`/similar/movie/${movie.id}`}
              showTypeBadge={true}
              showRating={true}
            />
          </div>
        )}

        {/* Where to Watch */}
        <StreamingProviders
          providers={movie.providers}
          title={movie.title}
          contentId={movie.id}
          contentType="movie"
          className="mt-16"
        />

        {/* Cast Section */}
        <CastSection cast={movie.credits.cast} className="mt-16" />
      </main>
    </>
  );
}

// ==========================================================================
// Helper Components
// ==========================================================================

function ContentTypeBadge({ type }: { type: ContentType }) {
  const config: Record<ContentType, { label: string; className: string }> = {
    movie: { label: 'Movie', className: 'bg-badge-movie/20 text-badge-movie' },
    tv: { label: 'TV Show', className: 'bg-badge-tv/20 text-badge-tv' },
    animation: { label: 'Animation', className: 'bg-badge-animation/20 text-badge-animation' },
    anime: { label: 'Anime', className: 'bg-badge-anime/20 text-badge-anime' },
  };

  const { label, className } = config[type];

  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', className)}>
      {label}
    </span>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function DetailItem({ icon, label, value }: DetailItemProps) {
  return (
    <div className="flex items-start gap-2 sm:gap-3">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-tertiary text-text-tertiary sm:h-8 sm:w-8">
        {icon}
      </div>
      <div>
        <p className="text-[10px] text-text-tertiary sm:text-xs">{label}</p>
        <p className="text-sm font-medium text-text-primary sm:text-base">{value}</p>
      </div>
    </div>
  );
}

// ==========================================================================
// Helper Functions
// ==========================================================================

interface TMDBMovieWithGenres {
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language: string;
}

function getMovieContentType(movie: TMDBMovieWithGenres): ContentType {
  const genreIds = movie.genre_ids ?? movie.genres?.map((g) => g.id) ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = movie.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'movie';
}

// Helper for generating metadata content type
function getMovieContentTypeForMeta(movie: {
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  original_language: string;
}): string {
  const genreIds = movie.genre_ids ?? movie.genres?.map((g) => g.id) ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = movie.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'movie';
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    ko: 'Korean',
    zh: 'Chinese',
    hi: 'Hindi',
    ar: 'Arabic',
    ru: 'Russian',
  };
  return languages[code] || code.toUpperCase();
}
