// ==========================================================================
// Movie Details Page
// /movie/[id] - Shows full movie information with cast, videos, providers
// ==========================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, Calendar, Play, Heart, ExternalLink } from 'lucide-react';
import { getMovieDetailsExtended, getRelatedMovies } from '@/lib/tmdb/movies';
import { getPosterUrl, getBackdropUrl, formatRuntime, extractYear, cn } from '@/lib/utils';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import { ContentRow } from '@/components/content';
import { CastSection } from '@/components/movie/CastSection';
import { StreamingProviders } from '@/components/movie/StreamingProviders';
import { VideoSection } from '@/components/movie/VideoSection';
import type { ContentType, Content } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface MoviePageProps {
  params: Promise<{ id: string }>;
}

// ==========================================================================
// Metadata Generation
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
    const title = year ? `${movie.title} (${year})` : movie.title;

    return {
      title: `${title} | FlickPick`,
      description: movie.overview || `Watch ${movie.title} - Find where to stream, get recommendations, and more.`,
      openGraph: {
        title: `${title} | FlickPick`,
        description: movie.overview || undefined,
        images: movie.backdrop_path
          ? [`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`]
          : undefined,
        type: 'video.movie',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | FlickPick`,
        description: movie.overview || undefined,
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

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    description: movie.overview,
    datePublished: movie.release_date,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    image: movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : undefined,
    aggregateRating: movie.vote_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: movie.vote_average.toFixed(1),
          bestRating: '10',
          worstRating: '0',
          ratingCount: movie.vote_count,
        }
      : undefined,
    director: directors.map((d) => ({
      '@type': 'Person',
      name: d.name,
    })),
    actor: movie.credits.cast.slice(0, 10).map((actor) => ({
      '@type': 'Person',
      name: actor.name,
    })),
    genre: movie.genres?.map((g) => g.name),
  };

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="relative min-h-[60vh] md:min-h-[70vh]">
        {/* Backdrop Image */}
        {backdropUrl && (
          <div className="absolute inset-0 z-0">
            <Image
              src={backdropUrl}
              alt=""
              fill
              priority
              className="object-cover object-top"
              sizes="100vw"
            />
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/40 to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="container relative z-10 flex min-h-[60vh] items-end pb-8 pt-24 md:min-h-[70vh] md:pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            {/* Poster */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative aspect-[2/3] w-64 overflow-hidden rounded-lg shadow-xl lg:w-72">
                <Image
                  src={posterUrl}
                  alt={movie.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 288px, 256px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              {/* Content Type Badge */}
              <div className="mb-3 flex items-center gap-2">
                <ContentTypeBadge type={contentType} />
                {movie.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/movie/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-bg-secondary/80 px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-text-primary md:text-4xl lg:text-5xl">
                {movie.title}
              </h1>

              {/* Tagline */}
              {movie.tagline && (
                <p className="mt-2 text-lg italic text-text-secondary">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}

              {/* Metadata Row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                {/* Rating */}
                {movie.vote_average > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold text-text-primary">
                      {movie.vote_average.toFixed(1)}
                    </span>
                    <span className="text-text-tertiary">
                      ({movie.vote_count.toLocaleString()})
                    </span>
                  </div>
                )}

                {/* Year */}
                {year && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{year}</span>
                  </div>
                )}

                {/* Runtime */}
                {movie.runtime && movie.runtime > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{formatRuntime(movie.runtime)}</span>
                  </div>
                )}

                {/* Directors */}
                {directors.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-tertiary">Directed by</span>
                    <span className="text-text-primary">
                      {directors.map((d) => d.name).join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {/* Overview */}
              <p className="mt-6 text-base leading-relaxed text-text-secondary md:text-lg">
                {movie.overview || 'No overview available.'}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Play Trailer Button */}
                {movie.videos && movie.videos.length > 0 && (
                  <a
                    href={`#trailers`}
                    className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium transition-colors hover:bg-accent-hover"
                  >
                    <Play className="h-5 w-5 fill-white text-white" />
                    <span className="text-white">Play Trailer</span>
                  </a>
                )}

                {/* Watchlist Button (placeholder - will be interactive later) */}
                <button className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary">
                  <Heart className="h-5 w-5" />
                  Add to Watchlist
                </button>

                {/* Similar Button */}
                <Link
                  href={`/similar/movie/${movie.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary"
                >
                  Find Similar
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8 md:py-12">
        {/* Streaming Providers */}
        <StreamingProviders providers={movie.providers} title={movie.title} />

        {/* Cast Section */}
        <CastSection cast={movie.credits.cast} className="mt-12" />

        {/* Videos/Trailers Section */}
        {movie.videos && movie.videos.length > 0 && (
          <VideoSection videos={movie.videos} className="mt-12" />
        )}

        {/* Similar Movies */}
        {similarContent.length > 0 && (
          <div className="mt-12">
            <ContentRow
              title="Similar Movies"
              items={similarContent}
              href={`/similar/movie/${movie.id}`}
              showTypeBadge={true}
              showRating={true}
            />
          </div>
        )}

        {/* Movie Details */}
        <section className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Details Card */}
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Details</h3>
            <dl className="space-y-3 text-sm">
              {movie.status && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Status</dt>
                  <dd className="text-text-primary">{movie.status}</dd>
                </div>
              )}
              {movie.release_date && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Release Date</dt>
                  <dd className="text-text-primary">
                    {new Date(movie.release_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {movie.runtime && movie.runtime > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Runtime</dt>
                  <dd className="text-text-primary">{formatRuntime(movie.runtime)}</dd>
                </div>
              )}
              {movie.original_title !== movie.title && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Original Title</dt>
                  <dd className="text-text-primary">{movie.original_title}</dd>
                </div>
              )}
              {movie.original_language && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Language</dt>
                  <dd className="text-text-primary uppercase">
                    {movie.original_language}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Financial Card */}
          {((movie.budget && movie.budget > 0) || (movie.revenue && movie.revenue > 0)) && (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
              <h3 className="mb-4 text-lg font-semibold text-text-primary">Box Office</h3>
              <dl className="space-y-3 text-sm">
                {movie.budget && movie.budget > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">Budget</dt>
                    <dd className="text-text-primary">
                      ${movie.budget.toLocaleString()}
                    </dd>
                  </div>
                )}
                {movie.revenue && movie.revenue > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-text-tertiary">Revenue</dt>
                    <dd className="text-text-primary">
                      ${movie.revenue.toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* External Links Card */}
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">External Links</h3>
            <div className="flex flex-wrap gap-2">
              {movie.imdb_id && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  IMDb
                </a>
              )}
              {movie.homepage && (
                <a
                  href={movie.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Official Site
                </a>
              )}
              <a
                href={`https://www.themoviedb.org/movie/${movie.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
              >
                <ExternalLink className="h-4 w-4" />
                TMDB
              </a>
            </div>
          </div>
        </section>

        {/* Keywords */}
        {movie.keywords && movie.keywords.length > 0 && (
          <section className="mt-12">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {movie.keywords.map((keyword) => (
                <span
                  key={keyword.id}
                  className="rounded-full bg-bg-tertiary px-3 py-1.5 text-sm text-text-secondary"
                >
                  {keyword.name}
                </span>
              ))}
            </div>
          </section>
        )}
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
    <span className={cn('rounded-full px-3 py-1 text-xs font-medium', className)}>
      {label}
    </span>
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
