import type { Metadata } from 'next';
import { searchMovies, searchTVShows } from '@/lib/tmdb/search';
import { toMovie } from '@/lib/tmdb/movies';
import { toTVShow } from '@/lib/tmdb/tv';
import type { Content } from '@/types';
import { SearchResultsGrid } from './SearchResultsGrid';

// Pressing Enter in the search bar lands here; this page didn't exist and
// every full search was a 404.

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (Array.isArray(q) ? q[0] : q)?.trim();
  return {
    title: query ? `“${query}” – Search` : 'Search',
    robots: { index: false, follow: true },
  };
}

async function search(query: string): Promise<Content[]> {
  const [movies, shows] = await Promise.all([
    searchMovies({ query }).catch(() => ({ results: [] })),
    searchTVShows({ query }).catch(() => ({ results: [] })),
  ]);
  const items: Content[] = [
    ...(movies.results ?? []).map((m) => ({ ...toMovie(m), media_type: 'movie' as const })),
    ...(shows.results ?? []).map((s) => ({ ...toTVShow(s), media_type: 'tv' as const })),
  ];
  // Most relevant first: TMDB ranks each list by popularity, so merge on that.
  return items.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = ((Array.isArray(q) ? q[0] : q) ?? '').trim().slice(0, 100);
  const items = query ? await search(query) : [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold text-text-primary">
        {query ? <>Results for “{query}”</> : 'Search'}
      </h1>
      {!query ? (
        <p className="text-text-secondary">Type a movie or TV show title in the search bar.</p>
      ) : items.length === 0 ? (
        <p className="text-text-secondary">No movies or TV shows match “{query}”.</p>
      ) : (
        <SearchResultsGrid items={items} />
      )}
    </main>
  );
}
