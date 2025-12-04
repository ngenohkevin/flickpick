// ==========================================================================
// Season Details Page
// /tv/[id]/season/[season] - Shows all episodes for a specific season
// ==========================================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Star, Tv } from 'lucide-react';
import { getTVShowDetails, getSeasonDetails, toEpisode } from '@/lib/tmdb/tv';
import { getPosterUrl, getBackdropUrl } from '@/lib/utils';
import { EpisodeList, EpisodeCard } from '@/components/tv/EpisodeList';
import { EpisodeProgressBar, EpisodeStatusBadge } from '@/components/tv/EpisodeProgressBar';
import { SeasonSelector, SeasonQuickNav } from './SeasonSelector';
import type { Episode, EpisodeStatus, Season } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

interface SeasonPageProps {
  params: Promise<{ id: string; season: string }>;
}

interface EpisodeWithStatus extends Episode {
  is_released: boolean;
  days_until: number | null;
}

// ==========================================================================
// Metadata Generation
// ==========================================================================

export async function generateMetadata({ params }: SeasonPageProps): Promise<Metadata> {
  const { id, season } = await params;
  const showId = parseInt(id, 10);
  const seasonNum = parseInt(season, 10);

  if (isNaN(showId) || isNaN(seasonNum)) {
    return { title: 'Season Not Found | FlickPick' };
  }

  try {
    const [show, seasonDetails] = await Promise.all([
      getTVShowDetails(showId),
      getSeasonDetails(showId, seasonNum),
    ]);

    const title = `${show.name} - ${seasonDetails.name}`;

    return {
      title: `${title} | FlickPick`,
      description:
        seasonDetails.overview ||
        `View all episodes of ${show.name} ${seasonDetails.name}. See air dates, episode details, and track your progress.`,
      openGraph: {
        title: `${title} | FlickPick`,
        description: seasonDetails.overview || undefined,
        images: seasonDetails.poster_path
          ? [`https://image.tmdb.org/t/p/w500${seasonDetails.poster_path}`]
          : show.backdrop_path
            ? [`https://image.tmdb.org/t/p/w1280${show.backdrop_path}`]
            : undefined,
        type: 'video.tv_show',
      },
    };
  } catch {
    return { title: 'Season Not Found | FlickPick' };
  }
}

// ==========================================================================
// Page Component
// ==========================================================================

export default async function SeasonPage({ params }: SeasonPageProps) {
  const { id, season } = await params;
  const showId = parseInt(id, 10);
  const seasonNum = parseInt(season, 10);

  if (isNaN(showId) || isNaN(seasonNum)) {
    notFound();
  }

  let show;
  let seasonDetails;

  try {
    [show, seasonDetails] = await Promise.all([
      getTVShowDetails(showId),
      getSeasonDetails(showId, seasonNum),
    ]);
  } catch {
    notFound();
  }

  const now = new Date();

  // Process episodes with release status
  const episodes: EpisodeWithStatus[] = (seasonDetails.episodes ?? []).map((ep) => {
    const episode = toEpisode(ep);
    const airDate = ep.air_date ? new Date(ep.air_date) : null;
    const isReleased = airDate ? airDate <= now : false;

    let daysUntil: number | null = null;
    if (airDate && !isReleased) {
      const diffTime = airDate.getTime() - now.getTime();
      daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      ...episode,
      is_released: isReleased,
      days_until: daysUntil,
    };
  });

  // Calculate episode status
  const total = episodes.length;
  const released = episodes.filter((ep) => ep.is_released).length;
  const upcoming = total - released;

  const releasedEpisodes = episodes.filter((ep) => ep.is_released);
  const upcomingEpisodes = episodes.filter((ep) => !ep.is_released);

  const lastEpisodeWithStatus: EpisodeWithStatus | null = releasedEpisodes.length > 0 ? releasedEpisodes[releasedEpisodes.length - 1]! : null;
  const nextEpisodeWithStatus: EpisodeWithStatus | null = upcomingEpisodes.length > 0 ? upcomingEpisodes[0]! : null;

  // Convert to Episode type (without extra status fields)
  const toBaseEpisode = (ep: EpisodeWithStatus | null): Episode | null => {
    if (!ep) return null;
    const { is_released, days_until, ...baseEpisode } = ep;
    return baseEpisode;
  };

  const episodeStatus: EpisodeStatus = {
    total,
    released,
    upcoming,
    nextEpisode: toBaseEpisode(nextEpisodeWithStatus),
    lastEpisode: toBaseEpisode(lastEpisodeWithStatus),
    isComplete: upcoming === 0 && total > 0,
    isAiring: upcoming > 0,
  };

  // Get season info
  const seasonInfo: Season = {
    id: seasonDetails.id,
    name: seasonDetails.name,
    overview: seasonDetails.overview,
    poster_path: seasonDetails.poster_path,
    season_number: seasonDetails.season_number,
    episode_count: seasonDetails.episode_count,
    air_date: seasonDetails.air_date,
  };

  // Calculate average runtime
  const episodesWithRuntime = episodes.filter((ep) => ep.runtime && ep.runtime > 0);
  const avgRuntime =
    episodesWithRuntime.length > 0
      ? Math.round(episodesWithRuntime.reduce((sum, ep) => sum + (ep.runtime ?? 0), 0) / episodesWithRuntime.length)
      : null;

  // Calculate average rating
  const episodesWithRating = episodes.filter((ep) => ep.vote_average > 0);
  const avgRating =
    episodesWithRating.length > 0
      ? episodesWithRating.reduce((sum, ep) => sum + ep.vote_average, 0) / episodesWithRating.length
      : null;

  const posterUrl = getPosterUrl(seasonInfo.poster_path, 'large');
  const showPosterUrl = getPosterUrl(show.poster_path, 'large');
  const backdropUrl = getBackdropUrl(show.backdrop_path, 'original');

  // Get all seasons for navigation (excluding specials)
  const allSeasons = (show.seasons ?? [])
    .filter((s) => s.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .map((s) => ({ id: s.id, season_number: s.season_number }));

  // JSON-LD Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TVSeason',
    name: seasonInfo.name,
    seasonNumber: seasonInfo.season_number,
    numberOfEpisodes: seasonInfo.episode_count,
    datePublished: seasonInfo.air_date,
    partOfSeries: {
      '@type': 'TVSeries',
      name: show.name,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/tv/${show.id}`,
    },
    episode: episodes.map((ep) => ({
      '@type': 'TVEpisode',
      name: ep.name,
      episodeNumber: ep.episode_number,
      datePublished: ep.air_date,
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
      <section className="relative min-h-[40vh] md:min-h-[50vh]">
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
        <div className="container relative z-10 flex min-h-[40vh] items-end pb-8 pt-24 md:min-h-[50vh] md:pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:gap-8">
            {/* Poster */}
            <div className="hidden flex-shrink-0 md:block">
              <div className="relative aspect-[2/3] w-48 overflow-hidden rounded-lg shadow-xl lg:w-56">
                <Image
                  src={seasonInfo.poster_path ? posterUrl : showPosterUrl}
                  alt={`${show.name} ${seasonInfo.name}`}
                  fill
                  priority
                  className="object-cover"
                  sizes="(min-width: 1024px) 224px, 192px"
                />
              </div>
            </div>

            {/* Info */}
            <div className="max-w-2xl">
              {/* Back Link */}
              <Link
                href={`/tv/${show.id}`}
                className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {show.name}
              </Link>

              {/* Status Badge */}
              <div className="mb-3 flex items-center gap-2">
                <EpisodeStatusBadge status={episodeStatus} size="md" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-text-primary sm:text-3xl md:text-4xl">
                {seasonInfo.name}
              </h1>
              <p className="mt-1 text-base text-text-secondary sm:text-lg">{show.name}</p>

              {/* Metadata Row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-secondary sm:mt-4 sm:gap-4 sm:text-sm">
                {/* Air Date */}
                {seasonInfo.air_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>
                      {new Date(seasonInfo.air_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                      })}
                    </span>
                  </div>
                )}

                {/* Episodes */}
                <div className="flex items-center gap-1">
                  <Tv className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{total} Episodes</span>
                </div>

                {/* Average Runtime */}
                {avgRuntime && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>~{avgRuntime}m per ep</span>
                  </div>
                )}

                {/* Average Rating */}
                {avgRating && avgRating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning sm:h-4 sm:w-4" />
                    <span className="font-semibold text-text-primary">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-text-tertiary">avg</span>
                  </div>
                )}
              </div>

              {/* Episode Progress */}
              <div className="mt-6 max-w-md">
                <EpisodeProgressBar status={episodeStatus} size="lg" />
              </div>

              {/* Overview */}
              {seasonInfo.overview && (
                <p className="mt-4 text-sm leading-relaxed text-text-secondary sm:mt-6 sm:text-base">
                  {seasonInfo.overview}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container py-8 md:py-12">
        {/* Season Navigation */}
        <div className="mb-6 flex items-center justify-between sm:mb-8">
          <h2 className="text-lg font-semibold text-text-primary sm:text-xl md:text-2xl">
            All Episodes
          </h2>

          {/* Season Selector */}
          {allSeasons.length > 1 && (
            <SeasonSelector
              showId={showId}
              currentSeason={seasonNum}
              allSeasons={allSeasons}
            />
          )}
        </div>

        {/* Next Episode Highlight */}
        {nextEpisodeWithStatus && (
          <div className="mb-6 rounded-lg border border-warning/30 bg-warning/10 p-3 sm:mb-8 sm:p-4 md:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              {nextEpisodeWithStatus.still_path && (
                <div className="relative hidden h-20 w-32 flex-shrink-0 overflow-hidden rounded sm:block">
                  <Image
                    src={`https://image.tmdb.org/t/p/w300${nextEpisodeWithStatus.still_path}`}
                    alt={nextEpisodeWithStatus.name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-warning sm:text-xs">
                  Next Episode
                </p>
                <h3 className="mt-1 text-sm font-semibold text-text-primary sm:text-base">
                  S{nextEpisodeWithStatus.season_number}E{nextEpisodeWithStatus.episode_number}: {nextEpisodeWithStatus.name}
                </h3>
                {nextEpisodeWithStatus.air_date && (
                  <p className="mt-1 text-xs text-text-secondary sm:text-sm">
                    Airs{' '}
                    {nextEpisodeWithStatus.days_until === 0
                      ? 'Today'
                      : nextEpisodeWithStatus.days_until === 1
                        ? 'Tomorrow'
                        : new Date(nextEpisodeWithStatus.air_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                    {nextEpisodeWithStatus.days_until && nextEpisodeWithStatus.days_until > 1 && (
                      <span className="text-text-tertiary"> ({nextEpisodeWithStatus.days_until} days)</span>
                    )}
                  </p>
                )}
                {nextEpisodeWithStatus.overview && (
                  <p className="mt-1.5 line-clamp-2 text-xs text-text-tertiary sm:mt-2 sm:text-sm">
                    {nextEpisodeWithStatus.overview}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Episodes Table */}
        {episodes.length > 0 ? (
          <EpisodeList episodes={episodes} showName={show.name} />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tv className="h-16 w-16 text-text-tertiary" />
            <h3 className="mt-4 text-lg font-semibold text-text-primary">
              No episodes available
            </h3>
            <p className="mt-2 text-text-secondary">
              Episode information for this season is not yet available.
            </p>
          </div>
        )}

        {/* Episode Cards Grid (Alternative View for Small Screens) */}
        {episodes.length > 0 && (
          <div className="mt-10 lg:hidden sm:mt-12">
            <h3 className="mb-3 text-base font-semibold text-text-primary sm:mb-4 sm:text-lg">Episode Gallery</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {episodes.slice(0, 6).map((episode) => (
                <EpisodeCard key={episode.id} episode={episode} />
              ))}
            </div>
            {episodes.length > 6 && (
              <p className="mt-4 text-center text-sm text-text-tertiary">
                View the table above for all {episodes.length} episodes
              </p>
            )}
          </div>
        )}

        {/* Season Summary */}
        <section className="mt-10 grid gap-4 sm:mt-12 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Status Card */}
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4 sm:p-6">
            <h3 className="mb-3 text-base font-semibold text-text-primary sm:mb-4 sm:text-lg">Season Status</h3>
            <dl className="space-y-2 text-xs sm:space-y-3 sm:text-sm">
              <div className="flex justify-between">
                <dt className="text-text-tertiary">Total Episodes</dt>
                <dd className="font-medium text-text-primary">{total}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-tertiary">Released</dt>
                <dd className="font-medium text-success">{released}</dd>
              </div>
              {upcoming > 0 && (
                <div className="flex justify-between">
                  <dt className="text-text-tertiary">Upcoming</dt>
                  <dd className="font-medium text-warning">{upcoming}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-text-tertiary">Status</dt>
                <dd>
                  <EpisodeStatusBadge status={episodeStatus} size="sm" />
                </dd>
              </div>
            </dl>
          </div>

          {/* Ratings Card */}
          {avgRating && avgRating > 0 && (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h3 className="mb-3 text-base font-semibold text-text-primary sm:mb-4 sm:text-lg">Ratings</h3>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 sm:h-16 sm:w-16">
                  <Star className="h-6 w-6 fill-warning text-warning sm:h-8 sm:w-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-text-primary sm:text-3xl">{avgRating.toFixed(1)}</p>
                  <p className="text-xs text-text-tertiary sm:text-sm">Average Episode Rating</p>
                </div>
              </div>
              {/* Top rated episode */}
              {episodesWithRating.length > 0 && (
                <div className="mt-3 border-t border-border-subtle pt-3 sm:mt-4 sm:pt-4">
                  <p className="text-[10px] text-text-tertiary sm:text-xs">Highest Rated</p>
                  {(() => {
                    const topEp = [...episodesWithRating].sort(
                      (a, b) => b.vote_average - a.vote_average
                    )[0]!;
                    return (
                      <p className="mt-1 text-xs text-text-primary sm:text-sm">
                        E{topEp.episode_number}: {topEp.name}
                        <span className="ml-2 text-warning">{topEp.vote_average.toFixed(1)}</span>
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Other Seasons Card */}
          {allSeasons.length > 1 && (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4 sm:p-6">
              <h3 className="mb-3 text-base font-semibold text-text-primary sm:mb-4 sm:text-lg">Other Seasons</h3>
              <SeasonQuickNav
                showId={showId}
                currentSeason={seasonNum}
                allSeasons={allSeasons}
              />
              <p className="mt-3 text-xs text-text-tertiary sm:mt-4 sm:text-sm">
                {show.number_of_episodes} total episodes across {allSeasons.length} seasons
              </p>
            </div>
          )}
        </section>

        {/* Back to Show */}
        <div className="mt-10 text-center sm:mt-12">
          <Link
            href={`/tv/${show.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-tertiary sm:px-6 sm:py-3 sm:text-base"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to {show.name}
          </Link>
        </div>
      </main>
    </>
  );
}
