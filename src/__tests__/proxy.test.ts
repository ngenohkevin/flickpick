import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { legacyRedirect } from '@/proxy';
import { SITE_URL, SITE_HOST } from '@/lib/site';

function request(url: string, host: string, forwardedHost?: string) {
  const headers: Record<string, string> = { host };
  if (forwardedHost) headers['x-forwarded-host'] = forwardedHost;
  return new NextRequest(url, { headers });
}

describe('legacy domain redirect', () => {
  it('sends flickpick.site to the same page on the canonical domain', () => {
    const res = legacyRedirect(request('https://flickpick.site/movie/27205?ref=x', 'flickpick.site'));
    expect(res?.status).toBe(301);
    expect(res?.headers.get('location')).toBe(`${SITE_URL}/movie/27205?ref=x`);
  });

  it('handles www and a forwarded host with a port', () => {
    const res = legacyRedirect(request('http://internal:3000/', 'prod-apps-flickpick:3000', 'www.flickpick.site:443'));
    expect(res?.headers.get('location')).toBe(`${SITE_URL}/`);
  });

  it('leaves the canonical domain alone', () => {
    expect(legacyRedirect(request(`${SITE_URL}/discover`, SITE_HOST))).toBeNull();
  });
});

describe('site URL', () => {
  it('has no trailing slash and defaults off the expiring domain', () => {
    expect(SITE_URL.endsWith('/')).toBe(false);
    expect(SITE_HOST).not.toBe('flickpick.site');
  });
});
