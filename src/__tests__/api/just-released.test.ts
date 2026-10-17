import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/tmdb', () => ({
  discoverMovies: vi.fn(),
  toMovie: vi.fn((movie) => movie),
}));
vi.mock('@/lib/torrentio', () => ({
  filterAvailableMovies: vi.fn(async () => []),
}));
vi.mock('@/lib/redis', () => ({
  getCache: vi.fn(async () => null),
  setCache: vi.fn(async () => undefined),
  cacheKeys: {
    justReleasedMovies: () => 'just-released',
    justReleasedLastGood: () => 'just-released:last-good',
  },
}));

import { GET } from '@/app/api/just-released/movies/route';
import { discoverMovies } from '@/lib/tmdb';

const DAY = 86_400_000;

describe('GET /api/just-released/movies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
    vi.mocked(discoverMovies).mockResolvedValue({ page: 1, results: [], total_pages: 1, total_results: 0 });
  });

  afterEach(() => vi.useRealTimers());

  it('only takes films first released in the last 8 months, not reissues of older ones', async () => {
    await GET();

    expect(discoverMovies).toHaveBeenCalled();
    for (const [params] of vi.mocked(discoverMovies).mock.calls) {
      const oldest = params?.['primary_release_date.gte'];
      expect(oldest).toBeDefined();
      const ageDays = (Date.parse('2026-10-17') - Date.parse(oldest!)) / DAY;
      // Avatar: Fire and Ash (2025-12-17) re-entered through a June 2026 digital release
      expect(Date.parse(oldest!)).toBeGreaterThan(Date.parse('2025-12-17'));
      expect(ageDays).toBeGreaterThanOrEqual(120);
      // A digital/physical release in the window is still required
      expect(params?.with_release_type).toBe('4|5');
    }
  });
});
