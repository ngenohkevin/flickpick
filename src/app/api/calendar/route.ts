// ==========================================================================
// Calendar API Route
// GET /api/calendar - Fetch release calendar with upcoming movies and TV episodes
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { getOnTheAirTVShows, getTVShowDetails } from '@/lib/tmdb/tv';
import { getCached } from '@/lib/redis';
import { mapLimit } from '@/lib/async';
import { parseEnum, parseIdList } from '@/lib/params';
import type { CalendarResponse, CalendarRelease, CalendarReleaseItem, ContentType } from '@/types';

// ==========================================================================
// Types
// ==========================================================================

type CalendarTypeFilter = 'all' | 'movie' | 'tv';

interface TMDBMovieResult {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  genre_ids?: number[];
  original_language: string;
  origin_country?: string[];
}

interface TMDBTVResult {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  genre_ids?: number[];
  original_language: string;
  origin_country?: string[];
}

// ==========================================================================
// Helper Functions
// ==========================================================================

// Popular titles across the whole month (sorting by date put ~40 obscure
// titles from the first day or two of the month on the calendar)
const MOVIE_PAGES = 3;
const PREMIERE_PAGES = 2;
const ON_THE_AIR_PAGES = 2;
const DETAIL_CONCURRENCY = 6;
const CACHE_TTL_SECONDS = 3600;

/** First and last day of a YYYY-MM month as YYYY-MM-DD, or null if invalid. */
function getMonthBounds(month: string): { startStr: string; endStr: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthNum = Number(match[2]);
  if (year < 1900 || year > 2100 || monthNum < 1 || monthNum > 12) return null;

  const lastDay = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const mm = String(monthNum).padStart(2, '0');
  return { startStr: `${year}-${mm}-01`, endStr: `${year}-${mm}-${String(lastDay).padStart(2, '0')}` };
}

function getContentTypeForMovie(movie: TMDBMovieResult): ContentType {
  const genreIds = movie.genre_ids ?? [];
  const isAnimation = genreIds.includes(16);
  const isJapanese = movie.origin_country?.includes('JP') || movie.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'movie';
}

function getContentTypeForTV(show: TMDBTVResult): ContentType {
  const genreIds = show.genre_ids ?? [];
  const isAnimation = genreIds.includes(16);
  const isJapanese = show.origin_country?.includes('JP') || show.original_language === 'ja';

  if (isAnimation && isJapanese) return 'anime';
  if (isAnimation) return 'animation';
  return 'tv';
}

async function buildCalendar(
  month: string,
  startStr: string,
  endStr: string,
  type: CalendarTypeFilter,
  genreFilter: string | undefined
): Promise<CalendarResponse> {
  const releasesMap = new Map<string, CalendarReleaseItem[]>();
  const add = (date: string, item: CalendarReleaseItem) => {
    const existing = releasesMap.get(date) ?? [];
    existing.push(item);
    releasesMap.set(date, existing);
  };

  // Movies released this month, most popular first
  if (type === 'all' || type === 'movie') {
    const pages = await Promise.all(
      Array.from({ length: MOVIE_PAGES }, (_, i) =>
        discoverMovies({
          page: i + 1,
          sort_by: 'popularity.desc',
          'primary_release_date.gte': startStr,
          'primary_release_date.lte': endStr,
          ...(genreFilter && { with_genres: genreFilter }),
        }).catch(() => null)
      )
    );
    if (pages.every((p) => p === null)) throw new Error('TMDB movie discover unavailable');

    const seen = new Set<number>();
    for (const page of pages) {
      for (const movie of page?.results ?? []) {
        const typedMovie = movie as unknown as TMDBMovieResult;
        // Posterless titles are almost always obscure and render as blanks
        if (!typedMovie.release_date || !typedMovie.poster_path || seen.has(typedMovie.id)) continue;
        seen.add(typedMovie.id);
        add(typedMovie.release_date, {
          id: typedMovie.id,
          title: typedMovie.title,
          type: 'movie',
          content_type: getContentTypeForMovie(typedMovie),
          poster_path: typedMovie.poster_path,
        });
      }
    }
  }

  if (type === 'all' || type === 'tv') {
    const [onAirPages, premierePages] = await Promise.all([
      Promise.all(
        Array.from({ length: ON_THE_AIR_PAGES }, (_, i) => getOnTheAirTVShows(i + 1).catch(() => null))
      ),
      Promise.all(
        Array.from({ length: PREMIERE_PAGES }, (_, i) =>
          discoverTVShows({
            page: i + 1,
            sort_by: 'popularity.desc',
            'first_air_date.gte': startStr,
            'first_air_date.lte': endStr,
            ...(genreFilter && { with_genres: genreFilter }),
          }).catch(() => null)
        )
      ),
    ]);

    const placed = new Set<number>();

    // Series premieres this month: the discover result has the date already
    for (const page of premierePages) {
      for (const show of page?.results ?? []) {
        const typedShow = show as unknown as TMDBTVResult;
        if (!typedShow.first_air_date || !typedShow.poster_path || placed.has(typedShow.id)) continue;
        placed.add(typedShow.id);
        add(typedShow.first_air_date, {
          id: typedShow.id,
          title: typedShow.name,
          type: 'tv',
          content_type: getContentTypeForTV(typedShow),
          poster_path: typedShow.poster_path,
          episode: { season: 1, episode: 1, name: 'Series Premiere' },
        });
      }
    }

    // Airing shows: their next episode, when it falls in this month
    const onAirShows: TMDBTVResult[] = [];
    for (const page of onAirPages) {
      for (const show of page?.results ?? []) {
        const typedShow = show as unknown as TMDBTVResult;
        if (placed.has(typedShow.id) || onAirShows.some((s) => s.id === typedShow.id)) continue;
        if (genreFilter && !typedShow.genre_ids?.some((id) => genreFilter.split('|').includes(String(id)))) continue;
        onAirShows.push(typedShow);
      }
    }

    const nextEpisodes = await mapLimit(onAirShows, DETAIL_CONCURRENCY, async (show) => {
      try {
        const next = (await getTVShowDetails(show.id)).next_episode_to_air;
        if (!next?.air_date || next.air_date < startStr || next.air_date > endStr) return null;
        return {
          date: next.air_date,
          item: {
            id: show.id,
            title: show.name,
            type: 'tv' as const,
            content_type: getContentTypeForTV(show),
            poster_path: show.poster_path,
            episode: { season: next.season_number, episode: next.episode_number, name: next.name },
          },
        };
      } catch {
        return null;
      }
    });

    for (const result of nextEpisodes) {
      if (result) add(result.date, result.item);
    }
  }

  // Convert map to sorted array
  const releases: CalendarRelease[] = Array.from(releasesMap.entries())
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => {
        // Sort by type (movies first), then by title
        if (a.type !== b.type) {
          return a.type === 'movie' ? -1 : 1;
        }
        return a.title.localeCompare(b.title);
      }),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { month, releases };
}

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const now = new Date();
    const defaultMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') ?? defaultMonth;
    const type = parseEnum(searchParams.get('type'), ['all', 'movie', 'tv'] as const, 'all');
    const genreIds = parseIdList(searchParams.get('genre'));
    const genreFilter = genreIds.length > 0 ? genreIds.join('|') : undefined;

    // Validate month (YYYY-MM, a real month)
    const bounds = getMonthBounds(month);
    if (!bounds) {
      return NextResponse.json(
        { error: 'Invalid month. Use YYYY-MM', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Each month costs ~45 TMDB calls (most for next-episode dates), so it
    // is cached; this handler reads the query string, so the old
    // `revalidate` export never cached it.
    const response = await getCached(
      `calendar:v2:${month}:${type}:${genreFilter ?? ''}`,
      () => buildCalendar(month, bounds.startStr, bounds.endStr, type, genreFilter),
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch calendar data',
        code: 'TMDB_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
