import Link from 'next/link';
import { Search, Sparkles } from 'lucide-react';
import {
  getTrendingMovies,
  getTrendingTVShows,
  toMovie,
  toTVShow,
} from '@/lib/tmdb';
import { HeroSpotlight, ContentRow } from '@/components/content';
import { CategoryGrid } from '@/components/browse';
import { GENRE_PILLS } from '@/lib/constants';
import type { Content } from '@/types';

// Revalidate every hour
export const revalidate = 3600;

async function getHomepageData() {
  const [trendingMoviesRes, trendingTVRes] = await Promise.all([
    getTrendingMovies('day', 1),
    getTrendingTVShows('day', 1),
  ]);

  const trendingMovies = (trendingMoviesRes.results ?? []).slice(0, 12).map(toMovie);
  const trendingTV = (trendingTVRes.results ?? []).slice(0, 12).map(toTVShow);

  // Get top items for hero (mix of movies and TV with backdrops)
  const heroItems: Content[] = [
    ...trendingMovies.slice(0, 3),
    ...trendingTV.slice(0, 2),
  ].filter((item) => item.backdrop_path);

  return {
    heroItems,
    trendingMovies,
    trendingTV,
  };
}

export default async function HomePage() {
  const { heroItems, trendingMovies, trendingTV } = await getHomepageData();

  return (
    <div className="bg-bg-primary">
      {/* Hero Spotlight */}
      <HeroSpotlight items={heroItems} />

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
