import { NextResponse, type NextRequest } from 'next/server';
import { SITE_URL } from '@/lib/site';

/**
 * Hosts that permanently redirect to SITE_URL. flickpick.site expires in
 * November 2026 and still carries most visitors, so send them (and search
 * engines) to the same page on the canonical domain while it lasts.
 */
export const LEGACY_HOSTS = ['flickpick.site', 'www.flickpick.site'];

export function legacyRedirect(request: NextRequest): NextResponse | null {
  const header = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';
  const host = (header.split(',')[0] ?? '').split(':')[0]?.trim().toLowerCase() ?? '';
  if (!LEGACY_HOSTS.includes(host)) {
    return null;
  }
  const { pathname, search } = request.nextUrl;
  return NextResponse.redirect(`${SITE_URL}${pathname}${search}`, 301);
}

export default function proxy(request: NextRequest) {
  return legacyRedirect(request) ?? NextResponse.next();
}

// Only run for the legacy hosts; the canonical domain never enters the proxy.
export const config = {
  matcher: [{ source: '/:path*', has: [{ type: 'host', value: '(www\\.)?flickpick\\.site' }] }],
};
