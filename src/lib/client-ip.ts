import type { NextRequest } from 'next/server';

/**
 * The visitor's IP. Traffic arrives through Cloudflare, so the first
 * X-Forwarded-For entry is a Cloudflare edge (or whatever the client sent);
 * Cloudflare puts the real address in cf-connecting-ip.
 */
export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('cf-connecting-ip')?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
