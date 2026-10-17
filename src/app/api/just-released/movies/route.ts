// ==========================================================================
// Just Released Movies API Route
// GET /api/just-released/movies - Recent digital releases verified to have
// a real 4K stream (Torrentio)
//
// Only verified titles are ever returned. When nothing can be verified the
// list is empty and the home page hides the section; it used to fill it with
// unverified TMDB titles still badged "4K".
//
// Serving: an in-process copy, then Redis (fresh for 30 min), then the last
// verified list (kept for a week) while a refresh runs after the response.
// Only a cold start with nothing cached waits for the check.
// ==========================================================================

import { NextResponse, after } from 'next/server';
import { discoverMovies, toMovie } from '@/lib/tmdb';
import { filterAvailableMovies, type MovieWithAvailability } from '@/lib/torrentio';
import { getCache, setCache, cacheKeys } from '@/lib/redis';
import { CACHE_TTL } from '@/lib/constants';
import type { Movie } from '@/types';

// Not prerendered: a build-time run baked a result fetched from the CI
// runner into every image, and ISR kept even a 500 for an hour
export const dynamic = 'force-dynamic';

interface CachedResult {
  movies: MovieWithAvailability[];
  timestamp: number;
  source: 'torrentio';
}

const LIMIT = 20;
const CANDIDATE_PAGES = 3; // up to 60 candidates, most popular first
const WINDOW_DAYS = 120;
/**
 * Oldest first release (usually theatrical) a candidate may have: the window
 * plus the longest usual gap between cinema and home release
 */
const MAX_AGE_DAYS = 240;
/** Fewer verified titles than this never replaces a fuller list */
const MIN_GOOD = 6;
const FRESH_TTL = CACHE_TTL.JUST_RELEASED; // 30 min
const RETRY_TTL = 300; // after a weak or failed refresh
const LAST_GOOD_TTL = 7 * 24 * 3600;
/** Time budget for a check someone is waiting on, and for one run after the response */
const WAITING_DEADLINE_MS = 12_000;
const BACKGROUND_DEADLINE_MS = 45_000;

// Also serves when Redis is down
let memo: { result: CachedResult; freshUntil: number } | null = null;
// One refresh at a time per instance
let refreshing: Promise<CachedResult | null> | null = null;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Films with a digital or physical release in the window, most popular
 * first. (The theatrical date let films only in cinemas in, and pushed out
 * big titles whose digital release came more than 90 days after.)
 *
 * The first-release bound keeps out older films whose release in the window
 * is a later one: a 4K reissue (The Godfather), a new streaming home
 * (Interstellar) or another country's release (Avatar: Fire and Ash, F1).
 * TMDB matches a release in any country, so those made up a third of the
 * candidates.
 */
async function getCandidates(): Promise<Movie[]> {
  const pages = await Promise.all(
    Array.from({ length: CANDIDATE_PAGES }, (_, i) =>
      discoverMovies({
        page: i + 1,
        sort_by: 'popularity.desc',
        with_release_type: '4|5',
        'release_date.gte': isoDaysAgo(WINDOW_DAYS),
        'release_date.lte': isoDaysAgo(0),
        'primary_release_date.gte': isoDaysAgo(MAX_AGE_DAYS),
        'vote_count.gte': 50,
        'vote_average.gte': 5.5,
      }).catch(() => null)
    )
  );
  if (pages.every((p) => p === null)) throw new Error('TMDB discover unavailable');

  const seen = new Set<number>();
  const candidates: Movie[] = [];
  for (const page of pages) {
    for (const movie of page?.results ?? []) {
      if (seen.has(movie.id)) continue;
      seen.add(movie.id);
      candidates.push({ ...toMovie(movie), media_type: 'movie' as const });
    }
  }
  return candidates;
}

/** Verifies candidates against Torrentio and stores the outcome. */
async function refresh(deadlineMs: number): Promise<CachedResult | null> {
  const started = Date.now();
  const candidates = await getCandidates();
  const movies = await filterAvailableMovies(candidates, LIMIT, { deadline: started + deadlineMs });
  console.log(
    `[Just Released API] Verified ${movies.length}/${candidates.length} candidates in ${Date.now() - started}ms`
  );

  const result: CachedResult = { movies, timestamp: Date.now(), source: 'torrentio' };

  if (movies.length >= MIN_GOOD) {
    memo = { result, freshUntil: Date.now() + FRESH_TTL * 1000 };
    await Promise.all([
      setCache(cacheKeys.justReleasedMovies(), result, FRESH_TTL),
      setCache(cacheKeys.justReleasedLastGood(), result, LAST_GOOD_TTL),
    ]);
    return result;
  }

  // A weak run (Torrentio slow or down): serve the fuller of this run and
  // the last list, and try again in a few minutes
  const previous = memo?.result ?? (await getCache<CachedResult>(cacheKeys.justReleasedLastGood()));
  const best = previous && previous.movies.length >= movies.length ? previous : result;
  if (best.movies.length === 0) return null;

  memo = { result: best, freshUntil: Date.now() + RETRY_TTL * 1000 };
  await setCache(cacheKeys.justReleasedMovies(), best, RETRY_TTL);
  return best;
}

function startRefresh(deadlineMs: number): Promise<CachedResult | null> {
  refreshing ??= refresh(deadlineMs)
    .catch((error: unknown) => {
      console.error('[Just Released API] Refresh failed:', error);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const EMPTY = (): CachedResult => ({ movies: [], timestamp: Date.now(), source: 'torrentio' });

export async function GET() {
  try {
    if (memo && memo.freshUntil > Date.now()) {
      return NextResponse.json(memo.result);
    }

    const fresh = await getCache<CachedResult>(cacheKeys.justReleasedMovies());
    if (fresh && fresh.movies.length > 0) {
      memo = { result: fresh, freshUntil: Date.now() + 60_000 };
      return NextResponse.json(fresh);
    }

    // Stale: answer now with the last verified list, refresh afterwards
    const stale = memo?.result ?? (await getCache<CachedResult>(cacheKeys.justReleasedLastGood()));
    if (stale && stale.movies.length > 0) {
      after(() => startRefresh(BACKGROUND_DEADLINE_MS));
      return NextResponse.json(stale);
    }

    // Nothing cached at all: wait (bounded) for a check
    const result = await startRefresh(WAITING_DEADLINE_MS);
    return NextResponse.json(result ?? EMPTY());
  } catch (error) {
    console.error('Just Released Movies API error:', error);
    // An empty list hides the section; nothing here is cached
    return NextResponse.json(EMPTY());
  }
}
