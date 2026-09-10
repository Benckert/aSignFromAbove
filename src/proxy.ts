import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * Next.js 16 renamed this file convention from `middleware` to `proxy`; the
 * handler itself is unchanged. It resolves the locale from the URL and maps the
 * localised paths in `routing.ts` onto the canonical routes underneath.
 */
export default createMiddleware(routing);

export const config = {
  // Run on everything except API routes, Next internals and static files.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
