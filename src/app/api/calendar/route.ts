// ==========================================================================
// Calendar API Route
// GET /api/calendar - Fetch release calendar with upcoming movies and TV episodes
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { discoverMovies, discoverTVShows } from '@/lib/tmdb/discover';
import { getOnTheAirTVShows, getTVShowDetails } from '@/lib/tmdb/tv';
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

function formatDateForApi(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

function getMonthBounds(monthStr: string): { start: Date; end: Date } {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr ?? new Date().getFullYear().toString(), 10);
  const month = parseInt(monthNumStr ?? (new Date().getMonth() + 1).toString(), 10) - 1;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return { start, end };
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

// ==========================================================================
// Route Handler
// ==========================================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const month = searchParams.get('month') ?? defaultMonth;
    const type = (searchParams.get('type') ?? 'all') as CalendarTypeFilter;
    const genreFilter = searchParams.get('genre') ?? undefined;

    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json(
        { error: 'Invalid month format. Use YYYY-MM', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Get month boundaries
    const { start, end } = getMonthBounds(month);
    const startStr = formatDateForApi(start);
    const endStr = formatDateForApi(end);

    // Initialize releases map (date -> items)
    const releasesMap = new Map<string, CalendarReleaseItem[]>();

    // Fetch movies if type is 'all' or 'movie'
    if (type === 'all' || type === 'movie') {
      const moviesResponse = await discoverMovies({
        page: 1,
        sort_by: 'primary_release_date.asc',
        'primary_release_date.gte': startStr,
        'primary_release_date.lte': endStr,
        'vote_count.gte': 0,
        ...(genreFilter && { with_genres: genreFilter }),
      });

      // Fetch page 2 if available for more coverage
      let allMovies = moviesResponse.results ?? [];
      if ((moviesResponse.total_pages ?? 0) > 1) {
        const page2 = await discoverMovies({
          page: 2,
          sort_by: 'primary_release_date.asc',
          'primary_release_date.gte': startStr,
          'primary_release_date.lte': endStr,
          'vote_count.gte': 0,
          ...(genreFilter && { with_genres: genreFilter }),
        });
        allMovies = [...allMovies, ...(page2.results ?? [])];
      }

      // Add movies to releases map
      for (const movie of allMovies) {
        const typedMovie = movie as unknown as TMDBMovieResult;
        if (!typedMovie.release_date) continue;

        const date = typedMovie.release_date;
        const existing = releasesMap.get(date) ?? [];
        existing.push({
          id: typedMovie.id,
          title: typedMovie.title,
          type: 'movie',
          content_type: getContentTypeForMovie(typedMovie),
          poster_path: typedMovie.poster_path,
        });
        releasesMap.set(date, existing);
      }
    }

    // Fetch TV shows with episodes if type is 'all' or 'tv'
    if (type === 'all' || type === 'tv') {
      // Get TV shows currently on the air
      const onAirResponse = await getOnTheAirTVShows(1);
      const onAirShows = onAirResponse.results ?? [];

      // Also get shows with upcoming first air dates in this month
      const newShowsResponse = await discoverTVShows({
        page: 1,
        sort_by: 'first_air_date.asc',
        'first_air_date.gte': startStr,
        'first_air_date.lte': endStr,
        ...(genreFilter && { with_genres: genreFilter }),
      });
      const newShows = newShowsResponse.results ?? [];

      // Combine and deduplicate shows
      const allShowIds = new Set<number>();
      const allShows: TMDBTVResult[] = [];

      for (const show of [...onAirShows, ...newShows]) {
        const typedShow = show as unknown as TMDBTVResult;
        if (!allShowIds.has(typedShow.id)) {
          allShowIds.add(typedShow.id);
          allShows.push(typedShow);
        }
      }

      // For each show, try to get episode air dates
      // Limit concurrent requests to avoid rate limiting
      const showDetailsPromises = allShows.slice(0, 30).map(async (show) => {
        try {
          const details = await getTVShowDetails(show.id);

          // Check if show has next episode or was recently updated
          if (details.next_episode_to_air) {
            const epDate = details.next_episode_to_air.air_date;
            if (epDate && epDate >= startStr && epDate <= endStr) {
              return {
                date: epDate,
                item: {
                  id: show.id,
                  title: show.name,
                  type: 'tv' as const,
                  content_type: getContentTypeForTV(show),
                  poster_path: show.poster_path,
                  episode: {
                    season: details.next_episode_to_air.season_number,
                    episode: details.next_episode_to_air.episode_number,
                    name: details.next_episode_to_air.name,
                  },
                },
              };
            }
          }

          // For new shows, use first_air_date
          if (show.first_air_date && show.first_air_date >= startStr && show.first_air_date <= endStr) {
            return {
              date: show.first_air_date,
              item: {
                id: show.id,
                title: show.name,
                type: 'tv' as const,
                content_type: getContentTypeForTV(show),
                poster_path: show.poster_path,
                episode: {
                  season: 1,
                  episode: 1,
                  name: 'Series Premiere',
                },
              },
            };
          }

          return null;
        } catch {
          // If details fetch fails, try to use first_air_date if available
          if (show.first_air_date && show.first_air_date >= startStr && show.first_air_date <= endStr) {
            return {
              date: show.first_air_date,
              item: {
                id: show.id,
                title: show.name,
                type: 'tv' as const,
                content_type: getContentTypeForTV(show),
                poster_path: show.poster_path,
              },
            };
          }
          return null;
        }
      });

      const showResults = await Promise.all(showDetailsPromises);

      // Add TV shows to releases map
      for (const result of showResults) {
        if (!result) continue;
        const existing = releasesMap.get(result.date) ?? [];
        existing.push(result.item);
        releasesMap.set(result.date, existing);
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

    const response: CalendarResponse = {
      month,
      releases,
    };

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

// Revalidate every hour
export const revalidate = 3600;
