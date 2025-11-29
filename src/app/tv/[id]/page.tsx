// ==========================================================================
// TV Show Details Page
// /tv/[id] - Shows full TV show information with seasons, cast, videos
// ==========================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, Play, Heart, ExternalLink, Tv, Users } from 'lucide-react';
import { getTVShowDetailsExtended, getRelatedTVShows } from '@/lib/tmdb/tv';
import { getPosterUrl, getBackdropUrl, extractYear, cn } from '@/lib/utils';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import { ContentRow } from '@/components/content';
import { CastSection } from '@/components/movie/CastSection';
import { StreamingProviders } from '@/components/movie/StreamingProviders';
import { VideoSection } from '@/components/movie/VideoSection';
import { SeasonList } from '@/components/tv/SeasonList';
import { ShowStatus } from '@/components/tv/ShowStatus';
import type { ContentType, Content, TVShow as TVShowType, Season } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface TVPageProps {
  params: Promise<{ id: string }>;
}

// ==========================================================================
// Metadata Generation
// ==========================================================================

export async function generateMetadata({ params }: TVPageProps): Promise<Metadata> {
  const { id } = await params;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    return { title: 'TV Show Not Found | FlickPick' };
  }

  try {
    const show = await getTVShowDetailsExtended(showId);
    const startYear = extractYear(show.first_air_date);
    const endYear = show.status === 'Ended' ? extractYear(show.last_air_date) : null;
    const yearRange = endYear && endYear !== startYear
      ? `${startYear}-${endYear}`
      : startYear?.toString();
    const title = yearRange ? `${show.name} (${yearRange})` : show.name;

    return {
      title: `${title} | FlickPick`,
      description: show.overview || `Watch ${show.name} - Find where to stream, see seasons & episodes, and more.`,
      openGraph: {
        title: `${title} | FlickPick`,
        description: show.overview || undefined,
        images: show.backdrop_path
          ? [`https://image.tmdb.org/t/p/w1280${show.backdrop_path}`]
          : undefined,
        type: 'video.tv_show',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${title} | FlickPick`,
        description: show.overview || undefined,
      },
    };
  } catch {
    return { title: 'TV Show Not Found | FlickPick' };
  }
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function TVShowPage({ params }: TVPageProps) {
  const { id } = await params;
  const showId = parseInt(id, 10);

  if (isNaN(showId)) {
    notFound();
  }

  let show;
  let relatedShows;

  try {
    [show, relatedShows] = await Promise.all([
      getTVShowDetailsExtended(showId),
      getRelatedTVShows(showId),
    ]);
  } catch {
    notFound();
  }

  const startYear = extractYear(show.first_air_date);
  const endYear = show.status === 'Ended' ? extractYear(show.last_air_date) : null;
  const contentType = getTVShowContentType(show);
  const backdropUrl = getBackdropUrl(show.backdrop_path, 'original');
  const posterUrl = getPosterUrl(show.poster_path, 'large');

  // Format seasons (filter out season 0 / specials)
  const seasons: Season[] = (show.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      overview: s.overview,
      poster_path: s.poster_path,
      season_number: s.season_number,
      episode_count: s.episode_count,
      air_date: s.air_date,
    }));

  // Get average episode runtime
  const avgRuntime = show.episode_run_time?.length > 0
    ? Math.round(show.episode_run_time.reduce((a, b) => a + b, 0) / show.episode_run_time.length)
    : null;

  // Convert related shows to Content type for ContentRow
  const similarContent: Content[] = relatedShows.slice(0, 12).map((s) => ({
    id: s.id,
    media_type: 'tv' as const,
    name: s.name,
    original_name: s.original_name,
    overview: s.overview,
    poster_path: s.poster_path,
    backdrop_path: s.backdrop_path,
    first_air_date: s.first_air_date,
    vote_average: s.vote_average,
    vote_count: s.vote_count,
    popularity: s.popularity,
    genre_ids: s.genre_ids,
    original_language: s.original_language,
    origin_country: s.origin_country,
    number_of_seasons: s.number_of_seasons,
    number_of_episodes: s.number_of_episodes,
    episode_run_time: s.episode_run_time,
    status: s.status as TVShowType['status'],
    type: s.type ?? 'Scripted',
  }));

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeries',
    name: show.name,
    description: show.overview,
    startDate: show.first_air_date,
    endDate: show.status === 'Ended' ? show.last_air_date : undefined,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    image: show.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : undefined,
    aggregateRating: show.vote_count > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: show.vote_average.toFixed(1),
          bestRating: '10',
          worstRating: '0',
          ratingCount: show.vote_count,
        }
      : undefined,
    creator: show.created_by?.map((c) => ({
      '@type': 'Person',
      name: c.name,
    })),
    actor: show.credits.cast.slice(0, 10).map((actor) => ({
      '@type': 'Person',
      name: actor.name,
    })),
    genre: show.genres?.map((g) => g.name),
    productionCompany: show.networks?.map((n) => ({
      '@type': 'Organization',
      name: n.name,
    })),
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
                  alt={show.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 288px, 256px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              {/* Content Type Badge & Status */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ContentTypeBadge type={contentType} />
                <ShowStatus status={show.status} inProduction={show.in_production} />
                {show.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/tv/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-bg-secondary/80 px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-text-primary md:text-4xl lg:text-5xl">
                {show.name}
              </h1>

              {/* Tagline */}
              {show.tagline && (
                <p className="mt-2 text-lg italic text-text-secondary">
                  &ldquo;{show.tagline}&rdquo;
                </p>
              )}

              {/* Metadata Row */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-text-secondary">
                {/* Rating */}
                {show.vote_average > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold text-text-primary">
                      {show.vote_average.toFixed(1)}
                    </span>
                    <span className="text-text-tertiary">
                      ({show.vote_count.toLocaleString()})
                    </span>
                  </div>
                )}

                {/* Years */}
                {startYear && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {endYear && endYear !== startYear
                        ? `${startYear} - ${endYear}`
                        : show.status === 'Ended'
                          ? startYear
                          : `${startYear} - Present`}
                    </span>
                  </div>
                )}

                {/* Seasons */}
                <div className="flex items-center gap-1.5">
                  <Tv className="h-4 w-4" />
                  <span>
                    {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Episodes */}
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span>
                    {show.number_of_episodes} Episode{show.number_of_episodes !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Episode Runtime */}
                {avgRuntime && avgRuntime > 0 && (
                  <span className="text-text-tertiary">~{avgRuntime}m per episode</span>
                )}
              </div>

              {/* Networks */}
              {show.networks && show.networks.length > 0 && (
                <div className="mt-4 flex items-center gap-3">
                  {show.networks.slice(0, 3).map((network) => (
                    <div
                      key={network.id}
                      className="flex h-8 items-center rounded bg-white px-3"
                      title={network.name}
                    >
                      {network.logo_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${network.logo_path}`}
                          alt={network.name}
                          width={60}
                          height={24}
                          className="h-5 w-auto object-contain"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-900">
                          {network.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Creators */}
              {show.created_by && show.created_by.length > 0 && (
                <p className="mt-3 text-sm text-text-secondary">
                  <span className="text-text-tertiary">Created by </span>
                  <span className="text-text-primary">
                    {show.created_by.map((c) => c.name).join(', ')}
                  </span>
                </p>
              )}

              {/* Overview */}
              <p className="mt-6 text-base leading-relaxed text-text-secondary md:text-lg">
                {show.overview || 'No overview available.'}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Play Trailer Button */}
                {show.videos && show.videos.length > 0 && (
                  <a
                    href={`#trailers`}
                    className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-6 py-3 font-medium transition-colors hover:bg-accent-hover"
                  >
                    <Play className="h-5 w-5 fill-white text-white" />
                    <span className="text-white">Play Trailer</span>
                  </a>
                )}

                {/* Watchlist Button */}
                <button className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-6 py-3 font-medium text-text-primary transition-colors hover:bg-bg-tertiary">
                  <Heart className="h-5 w-5" />
                  Add to Watchlist
                </button>

                {/* Similar Button */}
                <Link
                  href={`/similar/tv/${show.id}`}
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
        <StreamingProviders providers={show.providers} title={show.name} />

        {/* Seasons List */}
        {seasons.length > 0 && (
          <SeasonList
            seasons={seasons}
            showId={show.id}
            showName={show.name}
            className="mt-12"
          />
        )}

        {/* Cast Section */}
        <CastSection cast={show.credits.cast} className="mt-12" />

        {/* Videos/Trailers Section */}
        {show.videos && show.videos.length > 0 && (
          <VideoSection videos={show.videos} className="mt-12" />
        )}

        {/* Similar Shows */}
        {similarContent.length > 0 && (
          <div className="mt-12">
            <ContentRow
              title="Similar Shows"
              items={similarContent}
              href={`/similar/tv/${show.id}`}
              showTypeBadge={true}
              showRating={true}
            />
          </div>
        )}

        {/* Show Details */}
        <section className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Details Card */}
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Details</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-tertiary">Status</dt>
                <dd className="text-text-primary">{show.status}</dd>
              </div>
              {show.type && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Type</dt>
                  <dd className="text-text-primary">{show.type}</dd>
                </div>
              )}
              {show.first_air_date && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">First Aired</dt>
                  <dd className="text-text-primary">
                    {new Date(show.first_air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {show.last_air_date && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Last Aired</dt>
                  <dd className="text-text-primary">
                    {new Date(show.last_air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </dd>
                </div>
              )}
              {show.original_name !== show.name && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Original Title</dt>
                  <dd className="text-text-primary">{show.original_name}</dd>
                </div>
              )}
              {show.original_language && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Language</dt>
                  <dd className="text-text-primary uppercase">
                    {show.original_language}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Next Episode Card */}
          {show.next_episode_to_air && (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
              <h3 className="mb-4 text-lg font-semibold text-text-primary">Next Episode</h3>
              <div className="space-y-2">
                <p className="text-text-primary font-medium">
                  S{show.next_episode_to_air.season_number}E{show.next_episode_to_air.episode_number}
                </p>
                <p className="text-sm text-text-secondary">{show.next_episode_to_air.name}</p>
                {show.next_episode_to_air.air_date && (
                  <p className="text-sm text-text-tertiary">
                    Airs{' '}
                    {new Date(show.next_episode_to_air.air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* External Links Card */}
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-6">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">External Links</h3>
            <div className="flex flex-wrap gap-2">
              {show.homepage && (
                <a
                  href={show.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-bg-tertiary px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                  Official Site
                </a>
              )}
              <a
                href={`https://www.themoviedb.org/tv/${show.id}`}
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
        {show.keywords && show.keywords.length > 0 && (
          <section className="mt-12">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Keywords</h3>
            <div className="flex flex-wrap gap-2">
              {show.keywords.map((keyword) => (
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

interface TMDBTVShowWithGenres {
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  origin_country?: string[];
  original_language: string;
}

function getTVShowContentType(show: TMDBTVShowWithGenres): ContentType {
  const genreIds = show.genre_ids ?? show.genres?.map((g) => g.id) ?? [];
  const originCountry = show.origin_country ?? [];
  const isAnimation = genreIds.includes(ANIMATION_GENRE_ID);
  const isJapanese = originCountry.includes('JP') || show.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'tv';
}
