// ==========================================================================
// Providers API Route
// GET /api/providers?region=GB - Which of our streaming services exist in a
// country, so the filters don't offer services with no catalogue there
// ==========================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableMovieProviders, getAvailableTVProviders } from '@/lib/tmdb/providers';
import { getCached } from '@/lib/redis';
import { STREAMING_PROVIDERS } from '@/lib/constants';

const CACHE_TTL_SECONDS = 86400;

async function providersInRegion(region: string): Promise<number[]> {
  const [movie, tv] = await Promise.all([
    getAvailableMovieProviders(region),
    getAvailableTVProviders(region),
  ]);
  const offered = new Set([...movie, ...tv].map((p) => p.provider_id));
  return STREAMING_PROVIDERS.filter((p) => (p.tmdbIds ?? [p.id]).some((id) => offered.has(id))).map((p) => p.id);
}

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get('region')?.match(/^[A-Z]{2}$/)?.[0];
  if (!region) {
    return NextResponse.json({ error: 'Invalid region', code: 'INVALID_INPUT' }, { status: 400 });
  }

  try {
    const ids = await getCached(`providers:v1:${region}`, () => providersInRegion(region), CACHE_TTL_SECONDS);
    return NextResponse.json(
      { region, ids },
      { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } }
    );
  } catch (error) {
    console.error('Providers API error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers', code: 'TMDB_ERROR' }, { status: 500 });
  }
}
