/**
 * Canonical public URL of the site, without a trailing slash.
 * Set NEXT_PUBLIC_SITE_URL at build time; the fallback is the production URL.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://flickpick.iopulse.cloud').replace(/\/+$/, '');

/** Host of SITE_URL, e.g. "flickpick.iopulse.cloud" (shown on share images). */
export const SITE_HOST = new URL(SITE_URL).host;
