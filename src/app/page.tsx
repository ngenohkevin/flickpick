import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Search, Sparkles, Blend, ArrowRight } from 'lucide-react';
import { generateWebsiteJsonLd, generateOrganizationJsonLd } from '@/lib/jsonld';
import {
  getTrendingMovies,
  getTrendingTVShows,
  getOnTheAirTVShows,
  getAiringTodayTVShows,
  discoverMovies,
  discoverAnimeMovies,
  discoverAnimeTVShows,
  toMovie,
  toTVShow,
  type TMDBTVShow,
} from '@/lib/tmdb';
import { tmdbFetch } from '@/lib/tmdb/client';
import {
  ContentRow,
  HeroWithJustReleased,
  JustReleasedSection,
} from '@/components/content';
import { JustReleasedTVRow } from '@/components/content/JustReleasedTVRow';
import { CategoryGrid } from '@/components/browse';
import { SkeletonRow } from '@/components/ui';
import { GENRE_PILLS } from '@/lib/constants';
import type { Content, Movie, TVShow } from '@/types';

// Dynamic import for StreamingTabs - loads only when in viewport
const StreamingTabs = dynamic(
  () => import('@/components/streaming/StreamingTabs').then((mod) => mod.StreamingTabs),
  {
    loading: () => (
      <section>
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-bg-tertiary sm:mb-6" />
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-10 w-24 animate-pulse rounded-full bg-bg-tertiary" />
          ))}
        </div>
        <SkeletonRow count={6} />
      </section>
    ),
  }
);

// Revalidate every hour
export const revalidate = 3600;

// ==========================================================================
// Data Fetching Functions
// ==========================================================================

/**
 * Get new movies from the last 7 days
 */
async function getNewMoviesThisWeek(): Promise<Movie[]> {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const response = await discoverMovies({
    sort_by: 'primary_release_date.desc',
    'primary_release_date.lte': today.toISOString().split('T')[0],
    'primary_release_date.gte': sevenDaysAgo.toISOString().split('T')[0],
    'vote_count.gte': 5, // Minimum votes for quality
  });

  return (response.results ?? []).slice(0, 12).map((m) => ({
    ...toMovie(m),
    media_type: 'movie' as const,
  }));
}

// NOTE: Just Released movies with Torrentio verification is now loaded
// on the client side via JustReleasedRowLazy to avoid blocking page load

// ==========================================================================
// Just Released TV Shows Types (no Torrentio - raw TMDB data)
// ==========================================================================

interface JustReleasedTVShow extends TVShow {
  latestEpisode?: {
    season: number;
    episode: number;
    name: string;
    airDate: string | null;
  };
  seasonProgress?: {
    currentSeason: number;
    releasedEpisodes: number;
    totalEpisodes: number;
    isComplete: boolean;
    isNewShow: boolean;
  };
}

interface TMDBTVShowDetails {
  id: number;
  last_episode_to_air?: {
    id: number;
    name: string;
    episode_number: number;
    season_number: number;
    air_date: string | null;
  } | null;
  next_episode_to_air?: {
    episode_number: number;
    season_number: number;
    air_date: string | null;
  } | null;
  seasons?: Array<{
    season_number: number;
    episode_count: number;
  }>;
}

/**
 * Get "Just Released" TV shows - directly from TMDB (no Torrentio)
 * TV shows don't go through theaters, so when an episode airs it's immediately available
 */
async function getJustReleasedTVShows(): Promise<JustReleasedTVShow[]> {
  // Get currently airing shows from multiple sources
  const [onTheAir1, onTheAir2, airingToday, trending] = await Promise.all([
    getOnTheAirTVShows(1),
    getOnTheAirTVShows(2),
    getAiringTodayTVShows(1),
    getTrendingTVShows('week', 1),
  ]);

  // Combine and deduplicate, prioritizing airing today
  const allShows = [
    ...(airingToday.results ?? []),
    ...(onTheAir1.results ?? []),
    ...(onTheAir2.results ?? []),
    ...(trending.results ?? []),
  ];
  const uniqueShowsMap = new Map<number, TMDBTVShow>();
  allShows.forEach((show) => {
    if (!uniqueShowsMap.has(show.id)) {
      uniqueShowsMap.set(show.id, show);
    }
  });

  // Filter and sort by popularity - get more candidates
  const candidateShows = Array.from(uniqueShowsMap.values())
    .filter((show) => show.vote_average >= 5.5 && show.vote_count >= 30)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 50); // More candidates

  // Get details for each show (episode info) - in parallel batches
  const now = new Date();
  const cutoffDate = new Date(now);
  cutoffDate.setDate(now.getDate() - 30); // Only shows with episodes in last 30 days

  const showsWithDetails: JustReleasedTVShow[] = [];
  const TARGET_SHOWS = 25; // Target number of shows

  // Process in batches of 8 for faster loading
  for (let i = 0; i < candidateShows.length && showsWithDetails.length < TARGET_SHOWS; i += 8) {
    const batch = candidateShows.slice(i, i + 8);

    const details = await Promise.all(
      batch.map(async (show) => {
        try {
          const details = await tmdbFetch<TMDBTVShowDetails>(`/tv/${show.id}`);
          return { show, details };
        } catch {
          return null;
        }
      })
    );

    for (const result of details) {
      if (!result || showsWithDetails.length >= TARGET_SHOWS) continue;

      const { show, details } = result;
      const lastEpisode = details.last_episode_to_air;

      // Skip if no episode data or episode is too old
      if (!lastEpisode?.air_date) continue;

      const airDate = new Date(lastEpisode.air_date);
      if (airDate < cutoffDate) continue;

      // Calculate season progress
      let seasonProgress: JustReleasedTVShow['seasonProgress'];
      if (lastEpisode && details.seasons) {
        const currentSeason = details.seasons.find(
          (s) => s.season_number === lastEpisode.season_number
        );
        if (currentSeason) {
          const totalEpisodes = currentSeason.episode_count;
          const releasedEpisodes = lastEpisode.episode_number;
          const isComplete = releasedEpisodes >= totalEpisodes;
          const isNewShow = lastEpisode.season_number === 1 && releasedEpisodes === 1;

          seasonProgress = {
            currentSeason: lastEpisode.season_number,
            releasedEpisodes,
            totalEpisodes,
            isComplete,
            isNewShow,
          };
        }
      }

      showsWithDetails.push({
        ...toTVShow(show),
        media_type: 'tv' as const,
        latestEpisode: {
          season: lastEpisode.season_number,
          episode: lastEpisode.episode_number,
          name: lastEpisode.name,
          airDate: lastEpisode.air_date,
        },
        seasonProgress,
      });
    }
  }

  // Sort by air date (most recent first)
  return showsWithDetails.sort((a, b) => {
    const dateA = a.latestEpisode?.airDate ? new Date(a.latestEpisode.airDate).getTime() : 0;
    const dateB = b.latestEpisode?.airDate ? new Date(b.latestEpisode.airDate).getTime() : 0;
    return dateB - dateA;
  });
}

/**
 * Get popular anime (mix of movies and TV)
 */
async function getPopularAnime(): Promise<Content[]> {
  const [animeMovies, animeTVShows] = await Promise.all([
    discoverAnimeMovies({ sort_by: 'popularity.desc' }),
    discoverAnimeTVShows({ sort_by: 'popularity.desc' }),
  ]);

  const movies = (animeMovies.results ?? []).slice(0, 6).map((m) => ({
    ...toMovie(m),
    media_type: 'movie' as const,
  }));
  const tvShows = (animeTVShows.results ?? []).slice(0, 6).map((s) => ({
    ...toTVShow(s),
    media_type: 'tv' as const,
  }));

  // Interleave movies and TV shows, sorted by popularity
  return [...movies, ...tvShows]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 12);
}

/**
 * Get all homepage data
 * NOTE: Torrentio-verified movies are loaded on client side to avoid blocking
 */
async function getHomepageData() {
  const [
    trendingMoviesRes,
    trendingTVRes,
    newMovies,
    justReleasedTVShows,
    popularAnime,
  ] = await Promise.all([
    getTrendingMovies('day', 1),
    getTrendingTVShows('day', 1),
    getNewMoviesThisWeek(),
    getJustReleasedTVShows(),
    getPopularAnime(),
  ]);

  const trendingMovies = (trendingMoviesRes.results ?? []).slice(0, 12).map(toMovie);
  const trendingTV = (trendingTVRes.results ?? []).slice(0, 12).map(toTVShow);

  // For hero: use trending movies and TV shows (fast, no Torrentio)
  // Show 12 slides total for good rotation
  const trendingMoviesWithBackdrops = trendingMovies.filter((m) => m.backdrop_path);
  const trendingTVWithBackdrops = trendingTV.filter((t) => t.backdrop_path);

  // Interleave trending movies and TV shows for variety
  const heroItems: Content[] = [];
  const maxLen = Math.max(trendingMoviesWithBackdrops.length, trendingTVWithBackdrops.length);
  for (let i = 0; i < maxLen && heroItems.length < 12; i++) {
    // Add 1 movie then 1 TV show for balanced mix
    if (i < trendingMoviesWithBackdrops.length) {
      heroItems.push(trendingMoviesWithBackdrops[i] as Content);
    }
    if (i < trendingTVWithBackdrops.length) {
      heroItems.push(trendingTVWithBackdrops[i] as Content);
    }
  }

  return {
    heroItems: heroItems.slice(0, 12),
    trendingMovies,
    trendingTV,
    newMovies,
    justReleasedTVShows,
    popularAnime,
  };
}

// ==========================================================================
// Homepage Component
// ==========================================================================

export default async function HomePage() {
  const {
    heroItems,
    trendingMovies,
    trendingTV,
    newMovies,
    justReleasedTVShows,
    popularAnime,
  } = await getHomepageData();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.site';

  return (
    <div className="bg-bg-primary">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            generateWebsiteJsonLd(siteUrl),
            generateOrganizationJsonLd(siteUrl),
          ]),
        }}
      />

      {/* Hero Spotlight + Just Released (Torrentio loads in background, updates hero when ready) */}
      <HeroWithJustReleased trendingItems={heroItems} />

      {/* Main Content */}
      <main className="container space-y-12 py-12 sm:space-y-16 sm:py-16">
        {/* AI Discovery Section */}
        <section className="rounded-2xl bg-gradient-to-br from-accent-primary/10 via-badge-anime/5 to-transparent p-4 sm:p-6 md:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent-primary/20 px-3 py-1 text-xs font-medium text-accent-primary sm:mb-4 sm:px-4 sm:py-1.5 sm:text-sm">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
              AI-Powered Discovery
            </div>

            <h2 className="text-xl font-bold text-text-primary sm:text-2xl md:text-3xl">
              Describe what you&apos;re in the mood for
            </h2>

            <p className="mt-2 text-sm text-text-secondary sm:text-base">
              Tell us what you want to watch and our AI will find the perfect match
            </p>

            {/* Search Input */}
            <div className="mt-4 sm:mt-6">
              <Link
                href="/discover"
                className="group relative mx-auto block max-w-xl overflow-hidden rounded-full border border-border-default bg-bg-tertiary py-3 pl-10 pr-4 text-left text-text-tertiary transition-colors hover:border-accent-primary hover:bg-bg-elevated sm:py-4 sm:pl-12"
              >
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary transition-colors group-hover:text-accent-primary sm:left-4 sm:h-5 sm:w-5" />
                <span className="block truncate text-sm sm:text-base">
                  <span className="hidden sm:inline">Try &ldquo;A cozy anime series to watch on a rainy day&rdquo;</span>
                  <span className="sm:hidden">Try &ldquo;A cozy anime to watch&rdquo;</span>
                </span>
              </Link>
            </div>

            {/* Mood Pills */}
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-6">
              <MoodPill label="Cozy" href="/mood/cozy" />
              <MoodPill label="Thrilling" href="/mood/thrilling" />
              <MoodPill label="Mind-bending" href="/mood/mind-bending" />
              <MoodPill label="Feel-good" href="/mood/feel-good" />
              <MoodPill label="Dark & Gritty" href="/mood/dark" />
            </div>
          </div>
        </section>

        {/* Content Blend Section - Prominent Feature */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/15 via-pink-500/10 to-orange-500/5 p-4 sm:p-6 md:p-8">
          {/* Decorative background elements */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-between">
              {/* Left side - Text content */}
              <div className="text-center lg:max-w-md lg:text-left">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-400 sm:mb-4 sm:px-4 sm:py-1.5 sm:text-sm">
                  <Blend className="h-3 w-3 sm:h-4 sm:w-4" />
                  Content Blender
                </div>

                <h2 className="text-xl font-bold text-text-primary sm:text-2xl md:text-3xl">
                  Blend your favorites
                </h2>

                <p className="mt-2 text-sm text-text-secondary sm:text-base">
                  Pick 2-3 movies or shows you love, and we&apos;ll find the perfect blend that combines their best elements
                </p>

                <Link
                  href="/blend"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-600 hover:gap-3 sm:mt-6 sm:px-6 sm:py-3 sm:text-base"
                >
                  Try Content Blender
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Right side - Example blends */}
              <div className="w-full max-w-md lg:w-auto">
                <p className="mb-3 text-center text-xs font-medium text-text-tertiary lg:text-left">
                  Popular blends to try:
                </p>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                  <BlendExample
                    titles={['Breaking Bad', 'Death Note']}
                    description="Crime thriller meets supernatural genius"
                  />
                  <BlendExample
                    titles={['Inception', 'The Matrix']}
                    description="Mind-bending sci-fi action"
                  />
                  <BlendExample
                    titles={['Friends', 'The Office']}
                    description="Workplace comedy classics"
                  />
                  <BlendExample
                    titles={['Spirited Away', 'Howl\'s Moving Castle']}
                    description="Magical Ghibli adventures"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Just Released Movies - Torrentio Verified (loads in background) */}
        <JustReleasedSection />

        {/* Just Released TV Shows */}
        {justReleasedTVShows.length > 0 && (
          <JustReleasedTVRow
            shows={justReleasedTVShows}
          />
        )}

        {/* New Movies This Week */}
        {newMovies.length > 0 && (
          <ContentRow
            title="New Movies This Week"
            items={newMovies}
            href="/new/movies"
            showTypeBadge={false}
          />
        )}


        {/* Trending Movies */}
        <ContentRow
          title="Trending Movies"
          items={trendingMovies}
          href="/movies"
          showTypeBadge={false}
        />

        {/* Trending TV Shows */}
        <ContentRow
          title="Trending TV Shows"
          items={trendingTV}
          href="/tv"
          showTypeBadge={false}
        />

        {/* Popular Anime */}
        {popularAnime.length > 0 && (
          <ContentRow
            title="Popular Anime"
            items={popularAnime}
            href="/anime"
            showTypeBadge={true}
          />
        )}

        {/* Popular on Streaming */}
        <StreamingTabs />

        {/* Browse by Category */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-text-primary sm:text-2xl">
            Browse by Category
          </h2>
          <CategoryGrid />
        </section>

        {/* Browse by Genre */}
        <section>
          <h2 className="mb-6 text-xl font-semibold text-text-primary sm:text-2xl">
            Browse by Genre
          </h2>
          <div className="flex flex-wrap gap-3">
            {GENRE_PILLS.map((genre) => (
              <Link
                key={genre.id}
                href={`/genre/movie/${genre.slug}`}
                className="rounded-full bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
              >
                {genre.name}
              </Link>
            ))}
          </div>
        </section>

        {/* Content Type Pills */}
        <section className="pb-8">
          <h2 className="mb-6 text-xl font-semibold text-text-primary sm:text-2xl">
            Browse by Type
          </h2>
          <div className="flex flex-wrap gap-4">
            <ContentTypePill label="Movies" color="badge-movie" href="/movies" />
            <ContentTypePill label="TV Shows" color="badge-tv" href="/tv" />
            <ContentTypePill label="Animation" color="badge-animation" href="/animation" />
            <ContentTypePill label="Anime" color="badge-anime" href="/anime" />
          </div>
        </section>
      </main>
    </div>
  );
}

// ==========================================================================
// Helper Components
// ==========================================================================

function MoodPill({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent-primary hover:text-accent-primary sm:px-4 sm:py-2 sm:text-sm"
    >
      {label}
    </Link>
  );
}

function ContentTypePill({
  label,
  color,
  href,
}: {
  label: string;
  color: string;
  href: string;
}) {
  const colorClasses: Record<string, { bg: string; bgHover: string; text: string }> = {
    'badge-movie': {
      bg: 'bg-badge-movie/20',
      bgHover: 'hover:bg-badge-movie/30',
      text: 'text-badge-movie',
    },
    'badge-tv': {
      bg: 'bg-badge-tv/20',
      bgHover: 'hover:bg-badge-tv/30',
      text: 'text-badge-tv',
    },
    'badge-animation': {
      bg: 'bg-badge-animation/20',
      bgHover: 'hover:bg-badge-animation/30',
      text: 'text-badge-animation',
    },
    'badge-anime': {
      bg: 'bg-badge-anime/20',
      bgHover: 'hover:bg-badge-anime/30',
      text: 'text-badge-anime',
    },
  };

  const colors = colorClasses[color] ?? colorClasses['badge-movie'];

  return (
    <Link
      href={href}
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${colors!.bg} ${colors!.bgHover} ${colors!.text}`}
    >
      {label}
    </Link>
  );
}

function BlendExample({
  titles,
  description,
}: {
  titles: string[];
  description: string;
}) {
  return (
    <Link
      href="/blend"
      className="group rounded-lg border border-border-subtle bg-bg-secondary/50 p-3 transition-all hover:border-purple-500/30 hover:bg-bg-secondary"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
        <span>{titles[0]}</span>
        <span className="text-purple-400">+</span>
        <span>{titles[1]}</span>
      </div>
      <p className="mt-1 text-xs text-text-tertiary group-hover:text-text-secondary">
        {description}
      </p>
    </Link>
  );
}
