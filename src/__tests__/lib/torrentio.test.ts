import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StreamLookup } from '@/lib/torrentio/providers';

const lookup = vi.fn<(imdbId: string) => Promise<StreamLookup>>();

vi.mock('@/lib/torrentio/providers', () => ({
  getMovieStreamsWithFallback: (imdbId: string) => lookup(imdbId),
  getTVStreamsWithFallback: vi.fn(),
}));

const { checkMovieAvailability } = await import('@/lib/torrentio/client');

const stream = (title: string) => ({ name: 'Torrentio\n4k', title, infoHash: 'x' });

beforeEach(() => lookup.mockReset());

describe('checkMovieAvailability', () => {
  it('accepts a 4K WEB-DL whose film title contains "Cam"', async () => {
    lookup.mockResolvedValue({
      streams: [stream('Camp.Rock.2008.2160p.WEB-DL.DDP5.1.Atmos.HDR.x265')],
      provider: 'torrentio',
      checked: true,
    });
    expect((await checkMovieAvailability('tt1')).available).toBe(true);
  });

  it('still rejects actual cam releases', async () => {
    lookup.mockResolvedValue({
      streams: [stream('Some.Movie.2026.2160p.HDCAM.x264'), stream('Some.Movie.2026.2160p.CAM.WEB')],
      provider: 'torrentio',
      checked: true,
    });
    expect((await checkMovieAvailability('tt2')).available).toBe(false);
  });

  it('marks the check as failed when no provider answered', async () => {
    lookup.mockResolvedValue({ streams: [], provider: 'none', checked: false });
    const result = await checkMovieAvailability('tt3');
    expect(result.available).toBe(false);
    expect(result.checkFailed).toBe(true);
  });

  it('does not mark a real "no streams" answer as failed', async () => {
    lookup.mockResolvedValue({ streams: [], provider: 'none', checked: true });
    expect((await checkMovieAvailability('tt4')).checkFailed).toBeUndefined();
  });
});
