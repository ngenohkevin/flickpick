// ==========================================================================
// Just Released Movies API Route
// GET /api/just-released/movies - Fetch movies with Torrentio availability
// Returns Torrentio-verified movies, or falls back to recent popular movies
// OPTIMIZED: Uses Redis caching at multiple levels
// ==========================================================================

import { NextResponse } from 'next/server';
import { discoverMovies, toMovie } from '@/lib/tmdb';
import { filterAvailableMovies, type MovieWithAvailability } from '@/lib/torrentio';
import { getCache, setCache, cacheKeys } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/constants';
import type { Movie } from '@/types';

// Cache for 1 hour (ISR)
export const revalidate = 3600;

interface CachedResult {
  movies: MovieWithAvailability[];
  timestamp: number;
  source: string;
}

export async function GET() {
  try {
    // Check for cached final results first (30 min cache)
    const cacheKey = cacheKeys.justReleasedMovies();
    const cached = await getCache<CachedResult>(cacheKey);

    if (cached && cached.movies.length > 0) {
      console.log('[Just Released API] Returning cached results:', cached.movies.length, 'movies');
      return NextResponse.json(cached);
    }

    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);

    // Get candidate movies (2 pages in parallel)
    const [page1, page2] = await Promise.all([
      discoverMovies({
        page: 1,
        sort_by: 'popularity.desc',
        'primary_release_date.lte': today.toISOString().split('T')[0],
        'primary_release_date.gte': ninetyDaysAgo.toISOString().split('T')[0],
        'vote_count.gte': 50,
        'vote_average.gte': 5.5,
      }),
      discoverMovies({
        page: 2,
        sort_by: 'popularity.desc',
        'primary_release_date.lte': today.toISOString().split('T')[0],
        'primary_release_date.gte': ninetyDaysAgo.toISOString().split('T')[0],
        'vote_count.gte': 50,
        'vote_average.gte': 5.5,
      }),
    ]);

    // Combine and deduplicate results
    const allResults = [...(page1.results ?? []), ...(page2.results ?? [])];
    const uniqueMoviesMap = new Map<number, (typeof allResults)[0]>();
    allResults.forEach((movie) => {
      if (!uniqueMoviesMap.has(movie.id)) {
        uniqueMoviesMap.set(movie.id, movie);
      }
    });
    const uniqueResults = Array.from(uniqueMoviesMap.values());

    // Reduced from 40 to 30 candidates - we only need 20 results
    const candidateMovies = uniqueResults.slice(0, 30).map((m) => ({
      ...toMovie(m),
      media_type: 'movie' as const,
    }));

    console.log('[Just Released API] Got', candidateMovies.length, 'candidate movies from TMDB');

    // Filter to only those with Torrentio availability
    // Add timeout to prevent hanging (reduced from 20s to 15s with caching)
    let availableMovies: MovieWithAvailability[] = [];
    let torrentioWorked = false;

    try {
      console.log('[Just Released API] Checking Torrentio for', candidateMovies.length, 'movies...');
      const timeoutPromise = new Promise<MovieWithAvailability[]>((resolve) => {
        setTimeout(() => {
          console.log('[Just Released API] Torrentio timeout after 15s');
          resolve([]);
        }, 15000);
      });
      availableMovies = await Promise.race([
        filterAvailableMovies(candidateMovies, 20),
        timeoutPromise,
      ]);
      torrentioWorked = availableMovies.length > 0;
      console.log('[Just Released API] Torrentio returned', availableMovies.length, 'movies');
    } catch (error) {
      console.error('[Just Released API] Torrentio check failed:', error);
    }

    // If Torrentio failed or returned nothing, return recent popular movies as fallback
    // These won't have availability data but at least the section won't be empty
    if (!torrentioWorked) {
      console.log('[Just Released API] Falling back to TMDB movies without Torrentio');
      const fallbackMovies: MovieWithAvailability[] = candidateMovies.slice(0, 20).map((movie) => ({
        ...movie,
        imdb_id: null,
        availability: {
          available: true, // Mark as available so they show
          streamCount: 0,
          bestQuality: null,
          sources: [],
          audioCodec: null,
          videoCodec: null,
          hasHDR: false,
        },
      }));

      const fallbackResult: CachedResult = {
        movies: fallbackMovies,
        timestamp: Date.now(),
        source: 'tmdb_fallback',
      };

      // Cache fallback for only 5 minutes (retry sooner)
      await setCache(cacheKey, fallbackResult, 300);

      return NextResponse.json(fallbackResult);
    }

    const result: CachedResult = {
      movies: availableMovies,
      timestamp: Date.now(),
      source: 'torrentio',
    };

    // Cache successful results for 30 minutes
    await setCache(cacheKey, result, CACHE_TTL.JUST_RELEASED);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Just Released Movies API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch just released movies', movies: [] },
      { status: 500 }
    );
  }
}
