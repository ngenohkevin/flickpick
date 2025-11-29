// ==========================================================================
// Trending API Route
// GET /api/trending - Returns trending movies and TV shows
// ==========================================================================

import { NextResponse } from 'next/server';
import { getTrendingMovies, getTrendingTVShows, toMovie, toTVShow } from '@/lib/tmdb';
import type { Content } from '@/types';

export const revalidate = 3600; // Revalidate every 1 hour

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all'; // 'all' | 'movie' | 'tv'
    const timeWindow = (searchParams.get('time_window') as 'day' | 'week') || 'day';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 40);

    const results: Content[] = [];

    if (type === 'all' || type === 'movie') {
      const moviesResponse = await getTrendingMovies(timeWindow, 1);
      const movies = (moviesResponse.results ?? [])
        .slice(0, type === 'all' ? Math.ceil(limit / 2) : limit)
        .map(toMovie);
      results.push(...movies);
    }

    if (type === 'all' || type === 'tv') {
      const tvResponse = await getTrendingTVShows(timeWindow, 1);
      const tvShows = (tvResponse.results ?? [])
        .slice(0, type === 'all' ? Math.ceil(limit / 2) : limit)
        .map(toTVShow);
      results.push(...tvShows);
    }

    // If 'all', interleave movies and TV shows for variety
    if (type === 'all') {
      results.sort((a, b) => b.popularity - a.popularity);
    }

    return NextResponse.json({
      results: results.slice(0, limit),
      type,
      timeWindow,
    });
  } catch (error) {
    console.error('Trending API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trending content', code: 'TMDB_ERROR' },
      { status: 500 }
    );
  }
}
