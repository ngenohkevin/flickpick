// ==========================================================================
// TV Show Details Page
// /tv/[id] - Shows full TV show information with seasons, trailer, cast
// ==========================================================================

// ISR: Revalidate every 12 hours - TV shows may have new episodes
export const revalidate = 43200;

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Calendar, Play, ExternalLink, Tv, Film, Globe, Users } from 'lucide-react';
import { getTVShowDetailsExtended, getRelatedTVShows } from '@/lib/tmdb/tv';
import { getPosterUrl, getBackdropUrl, extractYear, cn } from '@/lib/utils';
import { ANIMATION_GENRE_ID } from '@/lib/constants';
import dynamic from 'next/dynamic';
import { ContentRow } from '@/components/content';
import { CastSection } from '@/components/movie/CastSection';
import { StreamingProviders } from '@/components/movie/StreamingProviders';
import { hasTrailer } from '@/lib/video-utils';

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
import { SeasonList } from '@/components/tv/SeasonList';
import { ShowStatus } from '@/components/tv/ShowStatus';
import { WatchlistButton } from '@/components/ui';
import { ContentViewTracker } from '@/components/analytics/ContentViewTracker';
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

  // Check if there's a trailer
  const trailerAvailable = hasTrailer(show.videos || []);

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

      {/* Analytics Tracking */}
      <ContentViewTracker
        contentId={show.id}
        contentType="tv"
        title={show.name}
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
                  alt={show.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="144px"
                />
              </div>
              {/* Mobile Quick Info */}
              <div className="flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ContentTypeBadge type={contentType} />
                  <ShowStatus status={show.status} inProduction={show.in_production} />
                </div>
                {show.vote_average > 0 && (
                  <div className="mt-2 flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="text-sm font-bold text-warning">
                      {show.vote_average.toFixed(1)}
                    </span>
                  </div>
                )}
                {startYear && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {endYear && endYear !== startYear
                      ? `${startYear} - ${endYear}`
                      : show.status === 'Ended'
                        ? startYear
                        : `${startYear} - Present`}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Desktop Poster */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative aspect-[2/3] w-64 overflow-hidden rounded-xl shadow-2xl ring-1 ring-white/10 lg:w-80">
                <Image
                  src={posterUrl}
                  alt={show.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 320px, 256px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              {/* Content Type Badge & Status & Genres - Hidden on mobile */}
              <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
                <ContentTypeBadge type={contentType} />
                <ShowStatus status={show.status} inProduction={show.in_production} />
                {show.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/tv/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>
              {/* Mobile Genres */}
              <div className="mb-3 flex flex-wrap gap-1.5 md:hidden">
                {show.genres?.slice(0, 3).map((genre) => (
                  <Link
                    key={genre.id}
                    href={`/genre/tv/${genre.name.toLowerCase()}`}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-text-primary backdrop-blur-sm transition-colors hover:bg-white/20"
                  >
                    {genre.name}
                  </Link>
                ))}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl md:text-4xl lg:text-5xl">
                {show.name}
              </h1>

              {/* Tagline */}
              {show.tagline && (
                <p className="mt-2 text-sm italic text-text-secondary/90 sm:mt-3 sm:text-base md:text-lg">
                  &ldquo;{show.tagline}&rdquo;
                </p>
              )}

              {/* Key Stats - Hidden on mobile (shown in poster section) */}
              <div className="mt-6 hidden flex-wrap items-center gap-6 md:flex">
                {/* Rating */}
                {show.vote_average > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-warning/20 px-3 py-1.5">
                      <Star className="h-5 w-5 fill-warning text-warning" />
                      <span className="text-lg font-bold text-warning">
                        {show.vote_average.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-sm text-text-tertiary">
                      {show.vote_count.toLocaleString()} votes
                    </span>
                  </div>
                )}

                {/* Years */}
                {startYear && (
                  <div className="flex items-center gap-1.5 text-text-secondary">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">
                      {endYear && endYear !== startYear
                        ? `${startYear} - ${endYear}`
                        : show.status === 'Ended'
                          ? startYear
                          : `${startYear} - Present`}
                    </span>
                  </div>
                )}

                {/* Seasons & Episodes */}
                <div className="flex items-center gap-4 text-text-secondary">
                  <div className="flex items-center gap-1.5">
                    <Tv className="h-4 w-4" />
                    <span className="font-medium">
                      {show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Film className="h-4 w-4" />
                    <span className="font-medium">
                      {show.number_of_episodes} Episode{show.number_of_episodes !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Episode Runtime */}
                {avgRuntime && avgRuntime > 0 && (
                  <span className="text-sm text-text-tertiary">~{avgRuntime}m per episode</span>
                )}
              </div>

              {/* Networks */}
              {show.networks && show.networks.length > 0 && (
                <div className="mt-4 flex items-center gap-2 sm:mt-5 sm:gap-3">
                  {show.networks.slice(0, 4).map((network) => (
                    <div
                      key={network.id}
                      className="flex h-7 items-center rounded-lg bg-white px-2 sm:h-9 sm:px-4"
                      title={network.name}
                    >
                      {network.logo_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${network.logo_path}`}
                          alt={network.name}
                          width={60}
                          height={24}
                          className="h-4 w-auto object-contain sm:h-5"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-gray-900 sm:text-xs">
                          {network.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Creators */}
              {show.created_by && show.created_by.length > 0 && (
                <p className="mt-3 text-xs sm:mt-4 sm:text-sm">
                  <span className="text-text-tertiary">Created by </span>
                  <span className="font-medium text-text-primary">
                    {show.created_by.map((c) => c.name).join(', ')}
                  </span>
                </p>
              )}

              {/* Overview */}
              <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:mt-6 sm:text-base md:text-lg">
                {show.overview || 'No overview available.'}
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
                  id={show.id}
                  title={show.name}
                  mediaType="tv"
                  posterPath={show.poster_path}
                  variant="hero"
                />

                {/* Similar Button */}
                <Link
                  href={`/similar/tv/${show.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-text-primary backdrop-blur-sm transition-all hover:bg-white/20 sm:gap-2 sm:px-6 sm:py-3 sm:text-base"
                >
                  Find Similar
                </Link>
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
            {show.videos && show.videos.length > 0 && (
              <TrailerEmbed
                videos={show.videos}
                title={show.name}
                posterPath={show.poster_path}
              />
            )}
          </div>

          {/* Right: About the Show */}
          <div className="space-y-6">
            {/* Quick Facts */}
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h2 className="text-base font-semibold text-text-primary mb-3 sm:text-lg sm:mb-4">About the Show</h2>
              <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
                <DetailItem
                  icon={<Film className="h-4 w-4" />}
                  label="Status"
                  value={show.status}
                />
                {show.type && (
                  <DetailItem
                    icon={<Tv className="h-4 w-4" />}
                    label="Type"
                    value={show.type}
                  />
                )}
                {show.first_air_date && (
                  <DetailItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="First Aired"
                    value={new Date(show.first_air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  />
                )}
                {show.last_air_date && (
                  <DetailItem
                    icon={<Calendar className="h-4 w-4" />}
                    label="Last Aired"
                    value={new Date(show.last_air_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  />
                )}
                {show.original_language && (
                  <DetailItem
                    icon={<Globe className="h-4 w-4" />}
                    label="Language"
                    value={getLanguageName(show.original_language)}
                  />
                )}
                <DetailItem
                  icon={<Users className="h-4 w-4" />}
                  label="Total Episodes"
                  value={`${show.number_of_episodes} across ${show.number_of_seasons} season${show.number_of_seasons !== 1 ? 's' : ''}`}
                />
              </div>
              {show.original_name !== show.name && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <span className="text-sm text-text-tertiary">Original Title: </span>
                  <span className="text-sm text-text-primary">{show.original_name}</span>
                </div>
              )}
            </div>

            {/* Next Episode Card */}
            {show.next_episode_to_air && (
              <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4 sm:p-6">
                <h3 className="text-xs font-semibold text-accent-primary uppercase tracking-wider mb-2 sm:text-sm sm:mb-3">
                  Next Episode
                </h3>
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div>
                    <p className="text-base font-semibold text-text-primary sm:text-lg">
                      S{show.next_episode_to_air.season_number}E{show.next_episode_to_air.episode_number}: {show.next_episode_to_air.name}
                    </p>
                    {show.next_episode_to_air.air_date && (
                      <p className="mt-1 text-xs text-text-secondary sm:text-sm">
                        Airs{' '}
                        {new Date(show.next_episode_to_air.air_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                  {show.next_episode_to_air.air_date && (
                    <CountdownBadge date={show.next_episode_to_air.air_date} />
                  )}
                </div>
              </div>
            )}

            {/* External Links */}
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 sm:text-sm sm:mb-4">
                External Links
              </h3>
              <div className="flex flex-wrap gap-2">
                {show.homepage && (
                  <a
                    href={show.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-bg-tertiary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-border-default"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                <a
                  href={`https://www.themoviedb.org/tv/${show.id}`}
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
            {show.keywords && show.keywords.length > 0 && (
              <div className="rounded-xl border border-border-subtle bg-bg-secondary p-4 sm:p-6">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3 sm:text-sm sm:mb-4">
                  Keywords
                </h3>
                <div className="flex flex-wrap gap-2">
                  {show.keywords.slice(0, 10).map((keyword) => (
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

        {/* Seasons List */}
        {seasons.length > 0 && (
          <SeasonList
            seasons={seasons}
            showId={show.id}
            showName={show.name}
            className="mt-16"
          />
        )}

        {/* Similar Shows */}
        {similarContent.length > 0 && (
          <div className="mt-16">
            <ContentRow
              title="More Like This"
              items={similarContent}
              href={`/similar/tv/${show.id}`}
              showTypeBadge={true}
              showRating={true}
            />
          </div>
        )}

        {/* Where to Watch */}
        <StreamingProviders
          providers={show.providers}
          title={show.name}
          contentId={show.id}
          contentType="tv"
          className="mt-16"
        />

        {/* Cast Section */}
        <CastSection cast={show.credits.cast} className="mt-16" />
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

function CountdownBadge({ date }: { date: string }) {
  const airDate = new Date(date);
  const now = new Date();
  const diffTime = airDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return (
      <span className="rounded-lg bg-success/20 px-2 py-1 text-xs font-semibold text-success sm:px-3 sm:py-1.5 sm:text-sm">
        Today
      </span>
    );
  }

  if (diffDays === 1) {
    return (
      <span className="rounded-lg bg-warning/20 px-2 py-1 text-xs font-semibold text-warning sm:px-3 sm:py-1.5 sm:text-sm">
        Tomorrow
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-bg-tertiary px-2 py-1 text-xs font-semibold text-text-secondary sm:px-3 sm:py-1.5 sm:text-sm">
      In {diffDays} days
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
