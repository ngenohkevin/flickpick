import { describe, it, expect, vi, afterEach } from 'vitest';
import { getMovieStreamsWithFallback } from '@/lib/torrentio/providers';

function stubFetch(handler: (url: string) => { status: number; body?: unknown } | Error) {
  const fetchMock = vi.fn(async (url: string) => {
    const r = handler(url);
    if (r instanceof Error) throw r;
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body } as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe('getMovieStreamsWithFallback', () => {
  it('takes Torrentio\'s "no streams" as the answer instead of asking every fallback', async () => {
    const fetchMock = stubFetch(() => ({ status: 200, body: { streams: [] } }));
    const result = await getMovieStreamsWithFallback('tt100');
    expect(result).toEqual({ streams: [], provider: 'torrentio', checked: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to TorrentsDB when Torrentio is down', async () => {
    stubFetch((url) =>
      url.includes('torrentio')
        ? { status: 503 }
        : { status: 200, body: { streams: [{ name: 'TorrentsDB\n2160p', title: 'x' }] } }
    );
    const result = await getMovieStreamsWithFallback('tt101');
    expect(result.provider).toBe('torrentsdb');
    expect(result.streams).toHaveLength(1);
  });

  it('reports an unknown result (not "no streams") when every provider is down', async () => {
    stubFetch(() => new Error('network down'));
    const result = await getMovieStreamsWithFallback('tt102');
    expect(result.checked).toBe(false);
  });
});
