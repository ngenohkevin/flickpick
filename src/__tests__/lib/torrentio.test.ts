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

  it('reads quality from the tag and release name, not the uploader (Wolfmax4k)', async () => {
    // Live Torrentio answer for Heart of the Beast (2026), once shown as 4K
    lookup.mockResolvedValue({
      streams: [
        { name: 'Torrentio\n1080p', title: 'La bestia en la jungla (2026) [Bluray 1080p][Esp]\n👤 21 💾 10.42 GB ⚙️ Wolfmax4k\n🇬🇧 / 🇪🇸' },
        { name: 'Torrentio\n720p', title: 'La bestia en la jungla (2026) [Bluray 720p][Esp]\n👤 7 💾 4.56 GB ⚙️ Wolfmax4k' },
        { name: 'Torrentio\nCAM', title: 'HEART OF THE BEAST (2026) camrip 1080p ENG\n👤 634 💾 4.59 GB ⚙️ ThePirateBay' },
      ],
      provider: 'torrentio',
      checked: true,
    });
    expect((await checkMovieAvailability('tt7526136', 2026)).available).toBe(false);
  });

  it('treats a UHD source encoded at 1080p as 1080p', async () => {
    lookup.mockResolvedValue({
      streams: [{ name: 'TorrentsDB\n', title: 'Movie.2026.UHD.BluRay.1080p.DDP5.1.x264-GRP\n👤 5 💾 9 GB ⚙️ rargb' }],
      provider: 'torrentsdb',
      checked: true,
    });
    expect((await checkMovieAvailability('tt5', 2026)).available).toBe(false);
  });

  it('rejects early releases the addon tagged CAM/TeleSync even if the name says 2160p', async () => {
    lookup.mockResolvedValue({
      streams: [{ name: 'Torrentio\nTeleSync', title: 'Movie.2026.2160p.WEB-DL.x265\n👤 9 💾 5 GB ⚙️ EXT' }],
      provider: 'torrentio',
      checked: true,
    });
    expect((await checkMovieAvailability('tt6', 2026)).available).toBe(false);
  });

  it('ignores releases of another film (a different year in the name)', async () => {
    const otherFilm = { name: 'Torrentio\n4k', title: 'Shades of the Heart 2021 2160p WEB-DL DDP5.1 H 265\n👤 1 💾 9 GB ⚙️ ThePirateBay' };
    lookup.mockResolvedValue({ streams: [otherFilm], provider: 'torrentio', checked: true });
    expect((await checkMovieAvailability('tt7', 2026)).available).toBe(false);
    expect((await checkMovieAvailability('tt7', 2021)).available).toBe(true);
  });

  it('only flags HDR for HDR/Dolby Vision, not HDRip or a tracker name', async () => {
    lookup.mockResolvedValue({
      streams: [{ name: 'Torrentio\n4k', title: 'Movie.2026.2160p.WEB-DL.HDRip.DDP5.1.x265\n👤 3 💾 9 GB ⚙️ BluDV' }],
      provider: 'torrentio',
      checked: true,
    });
    expect((await checkMovieAvailability('tt8', 2026)).hasHDR).toBe(false);

    lookup.mockResolvedValue({
      streams: [{ name: 'Torrentio\n4k DV | HDR', title: 'Movie.2026.2160p.WEB-DL.DDP5.1.Atmos.DV.HDR.H.265-GRP\n👤 3 💾 19 GB ⚙️ TGx' }],
      provider: 'torrentio',
      checked: true,
    });
    const hdr = await checkMovieAvailability('tt9', 2026);
    expect(hdr.available).toBe(true);
    expect(hdr.hasHDR).toBe(true);
    expect(hdr.bestQuality).toBe('2160p');
  });

  it('does not mark a real "no streams" answer as failed', async () => {
    lookup.mockResolvedValue({ streams: [], provider: 'none', checked: true });
    expect((await checkMovieAvailability('tt4')).checkFailed).toBeUndefined();
  });
});
