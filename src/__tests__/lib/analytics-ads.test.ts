import { describe, it, expect, vi, afterEach } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete (window as { umami?: unknown }).umami;
  sessionStorage.clear();
});

describe('analytics queue', () => {
  it('holds events fired before the tracker loads and sends them on load', async () => {
    vi.stubEnv('NEXT_PUBLIC_UMAMI_WEBSITE_ID', 'site');
    vi.stubEnv('NEXT_PUBLIC_UMAMI_URL', 'https://analytics.example');
    const { trackCategoryView, flushAnalyticsQueue } = await import('@/lib/analytics');

    trackCategoryView('trending'); // landing page, script not loaded yet

    const track = vi.fn();
    window.umami = { track };
    flushAnalyticsQueue();
    expect(track).toHaveBeenCalledTimes(1);

    trackCategoryView('top-rated'); // loaded: sent directly
    expect(track).toHaveBeenCalledTimes(2);
    flushAnalyticsQueue(); // queue already drained
    expect(track).toHaveBeenCalledTimes(2);
  });

  it('does nothing when analytics is not configured', async () => {
    const { trackCategoryView, flushAnalyticsQueue } = await import('@/lib/analytics');
    trackCategoryView('trending');
    const track = vi.fn();
    window.umami = { track };
    flushAnalyticsQueue();
    expect(track).not.toHaveBeenCalled();
  });
});

describe('video ad cooldown', () => {
  it('skips pre-roll ads for 5 minutes after one is shown', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADS_ENABLED', 'true');
    const { shouldShowPrerollAds, markVideoAdShown } = await import('@/lib/ads/config');

    expect(shouldShowPrerollAds()).toBe(true);
    markVideoAdShown();
    expect(shouldShowPrerollAds()).toBe(false);

    sessionStorage.setItem('flickpick-video-ad-shown-at', String(Date.now() - 301_000));
    expect(shouldShowPrerollAds()).toBe(true);
  });
});
