// ==========================================================================
// Query-string parsing for API routes
// Raw values are passed through to TMDB, so anything malformed is dropped
// here instead of turning into a TMDB 4xx (or an ignored filter).
// ==========================================================================

import { TMDB_MAX_PAGE } from '@/lib/tmdb/genres';

/** A 1-based page number, clamped to what TMDB will serve. */
export function parsePage(raw: string | null | undefined, max: number = TMDB_MAX_PAGE): number {
  const page = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(page, max);
}

/** Comma-separated positive integer IDs ("28,35"); anything else is dropped. */
export function parseIdList(raw: string | null | undefined): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => /^\d+$/.test(part))
    .map(Number)
    .filter((id) => id > 0);
  return [...new Set(ids)];
}

/** A value from a fixed set, or the fallback. */
export function parseEnum<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
  fallback: T
): T {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}
